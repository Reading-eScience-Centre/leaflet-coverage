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
