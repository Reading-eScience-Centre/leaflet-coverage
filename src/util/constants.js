const COVJSON_PREFIX = 'http://coveragejson.org/def#'
export const COVJSON_POINT = COVJSON_PREFIX + 'Point'
export const COVJSON_POINTSERIES = COVJSON_PREFIX + 'PointSeries'
export const COVJSON_VERTICALPROFILE = COVJSON_PREFIX + 'VerticalProfile'
export const COVJSON_GRID = COVJSON_PREFIX + 'Grid'
export const COVJSON_TRAJECTORY = COVJSON_PREFIX + 'Trajectory'
export const COVJSON_POLYGONSERIES = COVJSON_PREFIX + 'PolygonSeries'
export const COVJSON_MULTIPOLYGON = COVJSON_PREFIX + 'MultiPolygon'

// FIXME these should maybe live under a different namespace (Polygon collides with the same-named profile)
// alternatively, profile URIs should live somewhere else
export const COVJSON_DATATYPE_TUPLE = COVJSON_PREFIX + 'Tuple'
export const COVJSON_DATATYPE_POLYGON = COVJSON_PREFIX + 'Polygon'

// JS API object types
export {COVERAGE, COVERAGECOLLECTION, DOMAIN} from 'covutils'