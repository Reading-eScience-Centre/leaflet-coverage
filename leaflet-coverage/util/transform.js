import wu from 'wu'
import ndarray from 'ndarray'

/**
 * Returns a copy of the given Coverage object with the parameters
 * replaced by the supplied ones.
 */
export function withParameters (cov, params) {
  let newcov = shallowcopy(cov)
  newcov.parameters = params  
  return newcov
}

/**
 * Returns a copy of the given Coverage object with the categories
 * of a given parameter replaced by the supplied ones.
 */
export function withCategories (cov, key, categories) {
  let newparams = shallowcopy(cov.parameters)
  let newparam = shallowcopy(newparams.get(key))
  newparams.set(key, newparam)
  newparams.get(key).categories = categories
  let newcov = withParameters(cov, newparams)
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
 * @param {Object} polygon A GeoJSON polygon object.
 * @returns {Coverage}
 */
export function maskedByPolygon (cov, polygon) {
  if (!cov.domainType.endsWith('Grid')) {
    throw new Error('Sorry, only grids can be masked by polygon currently')
  }
  
  let polycoords = polygon.coordinates
    
  let ndarrayWrapper = (domain, values) => {
    let pnpolyCache = ndarray(new Uint8Array(domain.x.length * domain.y.length), [domain.x.length, domain.y.length])
    for (let i=0; i < domain.x.length; i++) {
      for (let j=0; j < domain.y.length; j++) {
        pnpolyCache.set(i, j, pnpoly(domain.x[i], domain.y[j], polycoords))
      }
    }
    return {
      shape: domain.shape,
      get: (...coords) => {
        // grid has (t,z,y,x) axis order
        if (pnpolyCache.get(coords[3], coords[2])) {
          return values.get(...coords)
        } else {
          return null
        }
      }
    }
  }
  
  let rangeWrapper = (domain, range) => ({
    values: ndarrayWrapper(domain, range.values),
    validMin: range.validMin,
    validMax: range.validMax
  })
  
  let loadRange = key => Promise.all([cov.loadDomain(), cov.loadRange(key)])
    .then(([domain, range]) => rangeWrapper(domain, range))
  
  let loadRanges = keys => Promise.all([cov.loadDomain(), cov.loadRanges(keys)])
    .then(([domain, ranges]) => new Map(wu(ranges).map(([key, range]) => [key, rangeWrapper(domain, range)])))
  
  // FIXME this does not work, it overrides the original prototype!
  let newcov = shallowcopy(cov)
  let proto = Object.getPrototypeOf(newcov)
  proto.loadRange = loadRange
  proto.loadRanges = loadRanges
  
  return newcov
}

/**
 * Point-in-polygon implementation from https://github.com/maxogden/geojson-js-utils.
 * 
 * Note that the point and the polygon must have the same CRS.
 * Also, longitudes must already be wrapped to a common range.
 * 
 * @param {number} x The x coordinate of the point.
 * @param {number} y The y coordinate of the point.
 * @param {array} coords The "coordinates" member of a GeoJSON polygon.
 * @returns {boolean} true, if the point is inside the polygon, otherwise false.
 */
function pnpoly (x, y, coords) {
  var vert = [ [0,0] ]

  for (var i = 0; i < coords.length; i++) {
    for (var j = 0; j < coords[i].length; j++) {
      vert.push(coords[i][j])
    }
    vert.push(coords[i][0])
    vert.push([0,0])
  }

  var inside = false
  for (var i = 0, j = vert.length - 1; i < vert.length; j = i++) {
    if (((vert[i][0] > y) != (vert[j][0] > y)) && (x < (vert[j][1] - vert[i][1]) * (y - vert[i][0]) / (vert[j][0] - vert[i][0]) + vert[i][1]))
      inside = !inside
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