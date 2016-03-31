import {COVJSON_DATATYPE_TUPLE, COVJSON_DATATYPE_POLYGON} from './constants.js'

const OPENGIS_CRS_PREFIX = 'http://www.opengis.net/def/crs/'

/** 3D WGS84 in lat-lon-height order */
const EPSG4979 = OPENGIS_CRS_PREFIX + 'EPSG/0/4979'

/** 2D WGS84 in lat-lon order */
const EPSG4326 = OPENGIS_CRS_PREFIX + 'EPSG/0/4326'

/** 2D WGS84 in lon-lat order */
const CRS84 = OPENGIS_CRS_PREFIX + 'OGC/1.3/CRS84'
  
/** CRSs in which horizontal position is specified by geodetic latitude and longitude */
const EllipsoidalCRSs = [EPSG4979, EPSG4326, CRS84]

/** Position of longitude axis */ 
const LongitudeAxisIndex = {
  [EPSG4979]: 1,
  [EPSG4326]: 1,
  [CRS84]: 0
}

/**
 * Return whether the reference system is a CRS in which
 * horizontal position is specified by geodetic latitude and longitude.
 */
export function isEllipsoidalCRS (rs) {
  // TODO should support unknown CRSs with embedded axis information
  // this also covers the case when there is no ID property
  return EllipsoidalCRSs.indexOf(rs.id) !== -1
}

/** @deprecated */
export let isGeodeticWGS84CRS = isEllipsoidalCRS

/**
 * Returns the referencing system matching the given component identifiers.
 * 
 * Note: If the input components used for searching are associated
 * to multiple reference systems, then this function returns `undefined`.
 */
export function getReferenceSystem (domain, components) {
  let ref = getReferenceObject(domain, components)
  if (ref) {
    return ref.system
  }
}

/** @deprecated */
export let getRefSystem = getReferenceSystem

/**
 * Return the reference system connection object matching the given component identifiers.
 * 
 * Note: If the input components used for searching are associated
 * to multiple reference systems, then this function returns ``undefined``.
 */
export function getReferenceObject (domain, components) {
  let ref = domain.referencing.find(ref => 
    components.every(id => ref.components.indexOf(id) !== -1))
  return ref
}

/**
 * Return the reference system connection object of the horizontal CRS of the domain,
 * or ``undefined`` if none found.
 * A horizontal CRS is either geodetic (typically ellipsoidal, meaning lat/lon)
 * or projected and has exactly two axes.
 */
export function getHorizontalCRSReferenceObject (domain) {
  let isHorizontal = ref => 
    ['GeodeticCRS', 'ProjectedCRS'].indexOf(ref.system.type) !== -1 && 
    ref.components.length === 2
  let ref = domain.referencing.find(isHorizontal)
  return ref
}

/**
 * Return a projection object based on the CRS found in the coverage domain.
 * If no CRS is found or it is unsupported, then ``undefined`` is returned.
 * 
 * A projection converts between geodetic lat/lon and projected x/y values.
 * 
 * For lat/lon CRSs the projection is defined such that an input lat/lon
 * position gets projected/wrapped to the longitude range used in the domain, for example
 * [0,360]. The purpose of this is to make intercomparison between different coverages easier.
 * 
 * The following limitations currently apply:
 * - only ellipsoidal CRSs are supported (lat/lon)
 * - only primitive axes and Tuple/Polygon composite axes are supported 
 * 
 * @param {Domain} domain A coverage domain object.
 * @return {IProjection} A stripped-down leaflet IProjection object.
 */
export function getProjection (domain) {
  let ref = domain.referencing.find(ref => isEllipsoidalCRS(ref.system))
  if (!ref) {
    // either no CRS found or not ellipsoidal
    return
  }
  
  let lonIdx = LongitudeAxisIndex[ref.system.id]  
  if (lonIdx > 1) {
    // this should never happen as longitude is always the first or second axis
    throw new Error
  }
  
  let lonComponent = ref.components[lonIdx]
  
  // we find the min and max longitude occuring in the domain by inspecting the axis values
  // Note: this is inefficient for big composite axes.
  //       In that case, something like a domain extent might help which has the min/max values for each component.
  // TODO handle bounds
  let lonMin, lonMax
  if (domain.axes.has(lonComponent)) {
    // longitude is a grid axis
    let lonAxisName = lonComponent
    let lonAxisVals = domain.axes.get(lonAxisName).values
    lonMin = lonAxisVals[0]
    lonMax = lonAxisVals[lonAxisVals.length-1]
    if (lonMin > lonMax) {
      [lonMin,lonMax] = [lonMax,lonMin]
    }
  } else {
    // longitude is not a primitive grid axis but a component of a composite axis
    
    // find the composite axis containing the longitude component
    let axes = [...domain.axes.values()]
    let axis = axes.find(axis => axis.components.indexOf(lonComponent) !== -1)
    let lonCompIdx = axis.components.indexOf(lonComponent)
    
    // scan the composite axis for min/max longitude values
    lonMin = Infinity
    lonMax = -Infinity
    if (axis.dataType === COVJSON_DATATYPE_TUPLE) {
      for (let tuple of axis.values) {
        let lon = tuple[lonCompIdx]
        lonMin = Math.min(lon, lonMin)
        lonMax = Math.max(lon, lonMax)
      }      
    } else if (axis.dataType === COVJSON_DATATYPE_POLYGON) {
      for (let poly of axis.values) {
        for (let ring of poly) {
          for (let point of ring) {
            let lon = point[lonCompIdx]
            lonMin = Math.min(lon, lonMin)
            lonMax = Math.max(lon, lonMax)
          }
        }
      }
    } else {
      throw new Error('Unsupported data type: ' + axis.dataType)
    }
  }
  
  let lonMid = (lonMax + lonMin) / 2
  let lonMinExtended = lonMid - 180
  let lonMaxExtended = lonMid + 180
  
  return {
    project: ({lon,lat}) => {
      let lonProjected
      if (lonMinExtended <= lon && lon <= lonMaxExtended) {
        // use unchanged to avoid introducing rounding errors
        lonProjected = lon
      } else {
        lonProjected = ((lon - lonMinExtended) % 360 + 360) % 360 + lonMinExtended
      }
      
      let [x,y] = lonIdx === 0 ? [lonProjected, lat] : [lat, lonProjected]
      return {x, y}
    },
    unproject: ({x,y}) => {
      let [lon,lat] = lonIdx === 0 ? [x,y] : [y,x]
      return {lon,lat}
    }
  }
}

/**
 * Reprojects coordinates from one projection to another.
 */
export function reproject (pos, fromProjection, toProjection) {
  return toProjection.project(fromProjection.unproject(pos))
}
