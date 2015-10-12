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
 * @param {Object} polygon A GeoJSON Polygon object with 1 linear ring.
 * @returns {Coverage}
 */
export function maskedByPolygon (cov, polygon) {
  if (!cov.domainType.endsWith('Grid')) {
    throw new Error('Sorry, only grids can be masked by polygon currently')
  }
  
  let polycoords = polygon.coordinates[0]
  
  let ndarrayWrapper = (domain, values) => {
    let pnpolyCache = ndarray(new Uint8Array(domain.x.length * domain.y.length), [domain.x.length, domain.y.length])
    for (let i=0; i < domain.x.length; i++) {
      for (let j=0; j < domain.y.length; j++) {
        let inside = pnpoly(domain.x[i], domain.y[j], polycoords)
        pnpolyCache.set(i, j, inside)
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
  
  let newcov = shallowcopy(cov)
  newcov.loadRange = loadRange
  newcov.loadRanges = loadRanges
  
  return newcov
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
 * @param x {number} x coordinate of point
 * @param y {number} y coordinate of point
 * @param polygon {Array} an array of 2-item arrays of coordinates.
 * @returns {boolean} true if point is inside or false if not
 */
export function pnpoly (x, y, polygon) {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    let [xi,yi] = polygon[i]
    let [xj,yj] = polygon[j]

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