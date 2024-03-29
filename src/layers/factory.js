import {Grid} from './Grid.js'
import {Trajectory} from './Trajectory.js'
import {Point} from './Point.js'
import {PointSeries} from './PointSeries.js'
import {PointCollection} from './PointCollection.js'
import {VerticalProfile} from './VerticalProfile.js'
import {VerticalProfileCollection} from './VerticalProfileCollection.js'
import {MultiPolygon} from './MultiPolygon.js'
import {PolygonSeries} from './PolygonSeries.js'
import {MultiPolygonSeries} from './MultiPolygonSeries.js'
import {
  COVJSON_POINT, 
  COVJSON_POINTSERIES, 
  COVJSON_VERTICALPROFILE, 
  COVJSON_GRID, 
  COVJSON_TRAJECTORY, 
  COVJSON_MULTIPOLYGON,
  COVJSON_POLYGONSERIES,
  COVJSON_MULTIPOLYGONSERIES,
  COVERAGE,
  COVERAGECOLLECTION,
  DOMAIN
  } from '../util/constants.js'

const DOMAIN_LAYER_CLASSES = {
  [COVJSON_GRID]: Grid,
  [COVJSON_POINT]: Point,
  [COVJSON_POINTSERIES]: PointSeries,
  [COVJSON_VERTICALPROFILE]: VerticalProfile,
  [COVJSON_TRAJECTORY]: Trajectory,
  [COVJSON_MULTIPOLYGON]: MultiPolygon,
  [COVJSON_POLYGONSERIES]: PolygonSeries,
  [COVJSON_MULTIPOLYGONSERIES]: MultiPolygonSeries
}
  
const COLLECTION_LAYER_CLASSES = {
  [COVJSON_POINT]: PointCollection,
  [COVJSON_VERTICALPROFILE]: VerticalProfileCollection 
}

/**
 * Creates a layer for a given coverage data object or throws an error if no layer class could be found.
 * 
 * This is a convenience function over using {@link dataLayerClass} and manually
 * instantiating the layer.
 * 
 * @example
 * var cov = ...
 * var layer = C.dataLayer(cov, {parameter: 'temperature'}).addTo(map)
 *  
 * @return {function} A function fn(cov, options) which returns a new layer for
 *   the given coverage data object and which is initialized with the given layer options.
 * @throws {Error} If no layer class could be found.
 */
export function dataLayer (cov, options) {
  let clazz = dataLayerClass(cov)
  if (!clazz) {
    let coll = cov.type === COVERAGECOLLECTION ? 'collection ' : ''
    throw new Error(`No ${coll}layer class found for domainType=${cov.domainType}`)
  }
  return new clazz(cov, options)
}

/**
 * Return a layer class usable for the given coverage data object,
 * or `undefined` if none was found.
 * If multiple layers match, then an arbitrary one is returned.
 *  
 * @example
 * var cov = ...
 * var clazz = C.dataLayerClass(cov)
 * if (clazz) {
 *   var layer = new clazz(cov, {parameter: 'temperature'}).addTo(map)
 * }
 * 
 * @param {object} cov The coverage data object.
 * @return {class|undefined} The layer class.
 */
export function dataLayerClass (cov) {
  if ((cov.type === COVERAGE || cov.type === DOMAIN ) && cov.domainType in DOMAIN_LAYER_CLASSES) {
    return DOMAIN_LAYER_CLASSES[cov.domainType]
  }
  if (cov.type === COVERAGECOLLECTION && cov.domainType in COLLECTION_LAYER_CLASSES) {
    return COLLECTION_LAYER_CLASSES[cov.domainType]
  }
}
