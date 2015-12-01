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
 * Returns an array of the strings 'lat', 'lon', 'height' (if relevant)
 * in the order of the CRS axes.
 */
export function getWGS84AxisOrder (rs) {
  switch (rs.id) {
  case EPSG4979: return ['lat', 'lon', 'height']
  case EPSG4326: return ['lat', 'lon']
  case CRS84: return ['lon', 'lat'] 
  }
  throw new Error('Not a geodetic WGS84 CRS!')
}

/**
 * Returns the referencing system and the associated domain identifiers
 * matching the given identifiers.
 * The array of returned identifiers has a length equal or greater
 * than the input identifiers and is in the correct order as necessary
 * for the referencing system.
 * 
 * Note: If the input identifiers used for searching are associated
 * to multiple referencing systems, then this function returns `undefined`.
 */
export function getRefSystem (domain, identifiers) {
  let refs = domain.referencing
  let ref = refs.find(ref => 
    identifiers.all(id => ref.identifiers.indexOf(id) !== -1))
  if (!ref) return
  let rs = ref.srs || ref.trs || ref.rs
  return {
    identifiers: ref.identifiers,
    rs: rs
  }
}
