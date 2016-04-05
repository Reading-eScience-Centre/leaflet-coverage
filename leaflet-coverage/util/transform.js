import ndarray from 'ndarray'

import {COVJSON_GRID, COVJSON_DATATYPE_TUPLE, COVERAGE, DOMAIN} from './constants.js'
import {getHorizontalCRSReferenceObject, getProjection} from './referencing.js'

import {checkCoverage} from 'covutils/lib/validate.js'

/**
 * Returns a copy of the given Coverage object with the parameters
 * replaced by the supplied ones.
 * 
 * Note that this is a low-level function and no checks are done on the supplied parameters.
 */
export function withParameters (cov, params) {
  let newcov = {
    type: COVERAGE,
    profiles: cov.profiles,
    domainProfiles: cov.domainProfiles,
    parameters: params,
    loadDomain: () => cov.loadDomain(),
    loadRange: key => cov.loadRange(key),
    loadRanges: keys => cov.loadRanges(keys),
    subsetByIndex: constraints => cov.subsetByIndex(constraints).then(sub => withParameters(sub, params)),
    subsetByValue: constraints => cov.subsetByValue(constraints).then(sub => withParameters(sub, params))
  }
  return newcov
}

/**
 * Returns a copy of the given Coverage object with the categories 
 * of a given parameter replaced by the supplied ones and the encoding
 * adapted to the given mapping from old to new.
 * 
 * @param {Coverage} cov The Coverage object.
 * @param {String} key The key of the parameter to work with.
 * @param {object} observedProperty The new observed property including the new array of category objects
 *                           that will be part of the returned coverage.
 * @param {Map} mapping A mapping from source category id to destination category id.
 * @returns {Coverage}
 */
export function withCategories (cov, key, observedProperty, mapping) {
  /* check breaks with Babel, see https://github.com/jspm/jspm-cli/issues/1348
  if (!(mapping instanceof Map)) {
    throw new Error('mapping parameter must be a Map from/to category ID')
  }
  */
  checkCoverage(cov)
  if (observedProperty.categories.some(c => !c.id)) {
    throw new Error('At least one category object is missing the "id" property')
  }
  let newparams = shallowcopy(cov.parameters)
  let newparam = shallowcopy(newparams.get(key))
  newparams.set(key, newparam)
  newparams.get(key).observedProperty = observedProperty
  
  let fromCatEnc = cov.parameters.get(key).categoryEncoding
  let catEncoding = new Map()
  let categories = observedProperty.categories
  for (let category of categories) {
    let vals = []
    for (let [fromCatId, toCatId] of mapping) {
      if (toCatId === category.id && fromCatEnc.has(fromCatId)) {
        vals.push(...fromCatEnc.get(fromCatId))
      }
    }
    if (vals.length > 0) {
      catEncoding.set(category.id, vals)
    }
  }
  newparams.get(key).categoryEncoding = catEncoding
  
  let newcov = withParameters(cov, newparams)
  return newcov
}

/**
 * @param {Coverage} cov The coverage.
 * @param {String} key The key of the parameter for which the mapping should be applied.
 * @param {Function} fn A function getting called as fn(obj, range) where obj is the axis indices object
 *   and range is the original range object.
 * @param {String} [dataType] The new data type to use for the range. If omitted, the original type is used.
 * @returns {Coverage}
 */
export function mapRange (cov, key, fn, dataType) {
  checkCoverage(cov)
  
  let rangeWrapper = range => {
    let newrange = {
      shape: range.shape,
      dataType: dataType || range.dataType,
      get: obj => fn(obj, range)
    }
    return newrange
  }
  
  let loadRange = paramKey => key === paramKey ? cov.loadRange(paramKey).then(rangeWrapper) : cov.loadRange(paramKey)
  
  let loadRanges = paramKeys => cov.loadRanges(paramKeys)
    .then(ranges => new Map([...ranges].map(([paramKey, range]) => [paramKey, key === paramKey ? rangeWrapper(range) : range])))
  
  let newcov = {
    type: COVERAGE,
    profiles: cov.profiles,
    domainProfiles: cov.domainProfiles,
    parameters: cov.parameters,
    loadDomain: () => cov.loadDomain(),
    loadRange,
    loadRanges,
    subsetByIndex: constraints => cov.subsetByIndex(constraints).then(sub => mapRange(sub, key, fn, dataType)),
    subsetByValue: constraints => cov.subsetByValue(constraints).then(sub => mapRange(sub, key, fn, dataType))
  }
  
  return newcov
}

/**
 * Returns a copy of the given Coverage object where the 
 * range values which belong to domain areas outside the
 * given polygon are returned as null (no data).
 * 
 * Note that this function has support for CoverageJSON
 * domain types only.
 * 
 * @param {Coverage} cov A Coverage object.
 * @param {Object} polygon A GeoJSON Polygon or MultiPolygon object.
 * @returns {Promise<Coverage>}
 */
export function maskByPolygon (cov, polygon) {
  checkCoverage(cov)
  if (cov.domainProfiles.indexOf(COVJSON_GRID) === -1) {
    throw new Error('Only grids can be masked by polygon currently, domain profiles: ' + cov.domainProfiles)
  }
  
  if (polygon.type === 'Polygon') {
    polygon = {
      type: 'MultiPolygon',
      coordinates: [polygon.coordinates]
    }
  }
  // prepare polygon coordinates for pnpoly algorithm
  // each polygon component is surrounded by (0,0) vertices
  let nvert = 1 + polygon.coordinates
    .map(poly => poly.map(comp => comp.length + 1).reduce((n1,n2) => n1 + n2))
    .reduce((n1,n2) => n1 + n2)
  let vertx = new Float64Array(nvert)
  let verty = new Float64Array(nvert)
  let vertIdx = 1
  for (let coords of polygon.coordinates) {
    for (let p=0; p < coords.length; p++) {
      let comp = coords[p]
      for (let i=0; i < comp.length; i++, vertIdx++) {
        vertx[vertIdx] = comp[i][0]
        verty[vertIdx] = comp[i][1]
      }      
      vertIdx++ // jump over (0,0)
    }
  }
  
  return cov.loadDomain().then(domain => {
    let x = domain.axes.get('x').values
    let y = domain.axes.get('y').values
    let pnpolyCache = ndarray(new Uint8Array(x.length * y.length), [x.length, y.length])

    for (let i=0; i < x.length; i++) {
      for (let j=0; j < y.length; j++) {
        let inside = pnpoly(x[i], y[j], vertx, verty)
        pnpolyCache.set(i, j, inside)
      }
    }
    
    let fn = (obj, range) => {
      if (pnpolyCache.get(obj.x || 0, obj.y || 0)) {
        return range.get(obj)
      } else {
        return null
      }
    }

    let newcov = cov
    for (let key of cov.parameters.keys()) {
      newcov = mapRange(newcov, key, fn)
    }
    return newcov
  })
}

/**
 * Returns a copy of the grid coverage subsetted to the given bounding box.
 * 
 * Any grid cell is included which intersects with the bounding box. 
 * 
 * @param {Coverage} cov A Coverage object with domain Grid.
 * @param {array} bbox [xmin,ymin,xmax,ymax] in native CRS coordinates.
 * @returns {Promise<Coverage>} A promise with a Coverage object as result.
 */
export function subsetByBbox (cov, bbox) {
  let [xmin,ymin,xmax,ymax] = bbox
  return cov.subsetByValue({x: {start: xmin, stop: xmax}, y: {start: ymin, stop: ymax}})
}

/**
 * Reproject a coverage.
 * 
 * Reprojecting means returning a new coverage where the horizontal CRS is replaced
 * and the horizontal domain coordinates are reprojected.
 * 
 * Current limitations:
 * - only point-type coverage domains are supported (Tuple only)
 * - only horizontal CRSs (2-dimensional) are supported
 * - only ellipsoidal CRSs (lat/lon) are supported (restriction of getProjection() function of referencing module)
 * 
 * Given the limitations, the current purpose for reprojection is simply to intercompare
 * a grid to a point coverage, or point to point, where both are in lat/lon but possibly
 * with a different longitude wrapping, e.g. [0,360] vs [-180,180].
 * 
 * @param {Coverage} cov The Coverage object to reproject.
 * @param {Domain} refDomain The reference domain from which the horizontal CRS is used.
 * @returns {Promise<Coverage>} A promise with the reprojected Coverage object as result.
 */
export function reproject (cov, refDomain) {
  return cov.loadDomain().then(sourceDomain => {
    let sourceRef = getHorizontalCRSReferenceObject(sourceDomain)
    // check that the CRS components don't refer to grid axes
    if (sourceRef.components.some(sourceDomain.axes.has)) {
      throw new Error('Grid reprojection not supported yet')
    }
    let [xComp,yComp] = sourceRef.components
    
    // TODO reproject bounds
    
    // find the composite axis that contains the horizontal coordinates
    let axes = [...sourceDomain.axes.values()]
    let axis = axes.find(axis => sourceRef.components.every(comp => axis.components.indexOf(comp) !== -1))
    let [xCompIdx,yCompIdx] = [axis.components.indexOf(xComp), axis.components.indexOf(yComp)]
    
    // find the target CRS and get the projection
    let sourceProjection = getProjection(sourceDomain)
    let targetProjection = getProjection(refDomain)
    
    // reproject the x/y part of every axis value
    // this is done by unprojecting to lon/lat, followed by projecting to the target x/y
    let values
    if (axis.dataType === COVJSON_DATATYPE_TUPLE) {
      // make a deep copy of the axis values and replace x,y values by the reprojected ones
      values = axis.values.map(tuple => tuple.slice())
      for (let tuple of values) {
        let [sourceX,sourceY] = [tuple[xCompIdx], tuple[yCompIdx]]
        let latlon = sourceProjection.unproject({x: sourceX, y: sourceY})
        let {x,y} = targetProjection.project(latlon)
        tuple[xCompIdx] = x
        tuple[yCompIdx] = y
      }      
    } else {
      throw new Error('Unsupported data type: ' + axis.dataType)
    }
    
    // assemble reprojected coverage    
    let newAxes = new Map(sourceDomain.axes)
    let newAxis = shallowcopy(axis)
    delete newAxis.bounds
    newAxis.values = values
    newAxes.set(axis.key, newAxis)
    
    let targetRef = getHorizontalCRSReferenceObject(refDomain)
    let newReferencing = sourceDomain.referencing.map(ref => {
      if (ref === sourceRef) {
        return {
          components: sourceRef.components,
          system: targetRef.system
        }
      } else {
        return ref
      }
    })
    
    let newDomain = {
      type: DOMAIN,
      profiles: sourceDomain.profiles,
      axes: newAxes,
      referencing: newReferencing
    }
    
    let newCoverage = {
      type: COVERAGE,
      profiles: cov.profiles,
      domainProfiles: cov.domainProfiles,
      parameters: cov.parameters,
      loadDomain: () => Promise.resolve(newDomain),
      loadRange: paramKey => cov.loadRange(paramKey),
      loadRanges: paramKeys => cov.loadRanges(paramKeys),
      subsetByIndex: constraints => cov.subsetByIndex(constraints).then(sub => reproject(sub, refDomain)),
      subsetByValue: constraints => cov.subsetByValue(constraints).then(sub => reproject(sub, refDomain))
    }
    return newCoverage
  })
}

/**
 * Returns whether a point is inside a polygon.
 * 
 * Based on Point Inclusion in Polygon Test (PNPOLY) by W. Randolph Franklin:
 * http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html
 * 
 * Note that this algorithm works both with closed (first point repeated at the end)
 * and unclosed polygons.
 *
 * @param {number} x x coordinate of point
 * @param {number} y y coordinate of point
 * @param {Array} vertx array of polygon x coordinates.
 * @param {Array} verty array of polygon y coordinates.
 * @returns {boolean} true if point is inside or false if not
 */
export function pnpoly (x, y, vertx, verty) {
  let inside = false
  let nvert = vertx.length
  for (let i = 0, j = nvert - 1; i < nvert; j = i++) {
    let xi = vertx[i]
    let yi = verty[i]
    let xj = vertx[j]
    let yj = verty[j]

    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
      inside = !inside
    }
  }
  return inside
}

/**
 * Shallow clone a given object.
 * 
 * Note: This does *not* handle all kinds of objects!
 */
function shallowcopy (obj) {
  let copy
  if (obj instanceof Map) {
    copy = new Map(obj)
  } else {
    copy = Object.create(Object.getPrototypeOf(obj))
    for (let prop in obj) {
      copy[prop] = obj[prop]
    } 
  }
  return copy
}
