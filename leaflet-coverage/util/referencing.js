/** 3D WGS84 in lat-lon-height order */
const EPSG4979 = 'http://www.opengis.net/def/crs/EPSG/0/4979'

/** 2D WGS84 in lat-lon order */
const EPSG4326 = 'http://www.opengis.net/def/crs/EPSG/0/4326'

/** 2D WGS84 in lon-lat order */
const CRS84 = 'http://www.opengis.net/def/crs/OGC/1.3/CRS84'
  
const GeodeticWGS84CRS = [
  EPSG4979,
  EPSG4326,
  CRS84
]

export function isGeodeticWGS84CRS (rs) {
  return GeodeticWGS84CRS.indexOf(rs.id) !== -1
}

/**
 * Returns the referencing system matching the given dimension identifiers.
 * 
 * Note: If the input dimensions used for searching are associated
 * to multiple referencing systems, then this function returns `undefined`.
 */
export function getRefSystem (domain, dimensions) {
  let refs = domain.referencing
  let ref = refs.find(ref => 
    dimensions.every(id => ref.dimensions.indexOf(id) !== -1))
  if (ref) {
    return ref.system
  }
}
