const COVJSON_PREFIX = 'https://covjson.org/def/'
const COVJSON_CORE_NS = COVJSON_PREFIX + 'core#'
const COVJSON_DOMAINTYPES_NS = COVJSON_PREFIX + 'domainTypes#'
/** @ignore */
export const COVJSON_POINT = COVJSON_DOMAINTYPES_NS + 'Point'
/** @ignore */
export const COVJSON_POINTSERIES = COVJSON_DOMAINTYPES_NS + 'PointSeries'
/** @ignore */
export const COVJSON_VERTICALPROFILE = COVJSON_DOMAINTYPES_NS + 'VerticalProfile'
/** @ignore */
export const COVJSON_GRID = COVJSON_DOMAINTYPES_NS + 'Grid'
/** @ignore */
export const COVJSON_TRAJECTORY = COVJSON_DOMAINTYPES_NS + 'Trajectory'
/** @ignore */
export const COVJSON_POLYGONSERIES = COVJSON_DOMAINTYPES_NS + 'PolygonSeries'
/** @ignore */
export const COVJSON_MULTIPOLYGON = COVJSON_DOMAINTYPES_NS + 'MultiPolygon'
/** @ignore */
export const COVJSON_MULTIPOLYGONSERIES = COVJSON_DOMAINTYPES_NS + 'MultiPolygonSeries'

/** @ignore */
export const COVJSON_DATATYPE_TUPLE = COVJSON_CORE_NS + 'tuple'
/** @ignore */
export const COVJSON_DATATYPE_POLYGON = COVJSON_CORE_NS + 'polygon'

// JS API object types
export {COVERAGE, COVERAGECOLLECTION, DOMAIN} from 'covutils'