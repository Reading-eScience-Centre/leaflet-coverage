const COVJSON_PREFIX = 'http://coveragejson.org/def#'
/** @ignore */
export const COVJSON_POINT = COVJSON_PREFIX + 'Point'
/** @ignore */
export const COVJSON_POINTSERIES = COVJSON_PREFIX + 'PointSeries'
/** @ignore */
export const COVJSON_VERTICALPROFILE = COVJSON_PREFIX + 'VerticalProfile'
/** @ignore */
export const COVJSON_GRID = COVJSON_PREFIX + 'Grid'
/** @ignore */
export const COVJSON_TRAJECTORY = COVJSON_PREFIX + 'Trajectory'
/** @ignore */
export const COVJSON_POLYGONSERIES = COVJSON_PREFIX + 'PolygonSeries'
/** @ignore */
export const COVJSON_MULTIPOLYGON = COVJSON_PREFIX + 'MultiPolygon'

// FIXME these should maybe live under a different namespace (Polygon collides with the same-named profile)
// alternatively, profile URIs should live somewhere else
/** @ignore */
export const COVJSON_DATATYPE_TUPLE = COVJSON_PREFIX + 'Tuple'
/** @ignore */
export const COVJSON_DATATYPE_POLYGON = COVJSON_PREFIX + 'Polygon'

// JS API object types
export {COVERAGE, COVERAGECOLLECTION, DOMAIN} from 'covutils'