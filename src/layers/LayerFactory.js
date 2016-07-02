import Grid from './Grid.js'
import Trajectory from './Trajectory.js'
import Point from './Point.js'
import PointSeries from './PointSeries.js'
import PointCollection from './PointCollection.js'
import VerticalProfile from './VerticalProfile.js'
import VerticalProfileCollection from './VerticalProfileCollection.js'
import MultiPolygon from './MultiPolygon.js'
import PolygonSeries from './PolygonSeries.js'
import {
  COVJSON_POINT, 
  COVJSON_POINTSERIES, 
  COVJSON_VERTICALPROFILE, 
  COVJSON_GRID, 
  COVJSON_TRAJECTORY, 
  COVJSON_MULTIPOLYGON,
  COVJSON_POLYGONSERIES,
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
  [COVJSON_POLYGONSERIES]: PolygonSeries
}
  
const COLLECTION_LAYER_CLASSES = {
  [COVJSON_POINT]: PointCollection,
  [COVJSON_VERTICALPROFILE]: VerticalProfileCollection 
}

/**
 * Return a factory function that creates a layer for a given coverage data object
 * or throws an error if no layer class could be found.
 * 
 * This is a convenience function over using {@link getLayerClass} and manually
 * instantiating the layer.
 * 
 * @example
 * var factory = LayerFactory() // has to be defined just once
 * var cov = ...
 * var layer = factory(cov, {keys: ['temperature']}).addTo(map)
 * 
 * @example <caption>Non-module access</caption>
 * L.coverage.LayerFactory
 * 
 * @return {function} A function fn(cov, options) which returns a new layer for
 *   the given coverage data object and which is initialized with the given layer options.
 * @throws {Error} If no layer class could be found.
 */
export default function LayerFactory () {
  return (cov, opts) => {
    let clazz = getLayerClass(cov)
    if (!clazz) {
      let coll = cov.type === COVERAGECOLLECTION ? 'collection ' : ''
      throw new Error(`No ${coll}layer class found for domainType=${cov.domainType}`)
    }
    return new clazz(cov, opts)
  }
}

/**
 * Return a layer class usable for the given coverage data object,
 * or <code>undefined</code> if none was found.
 * If multiple layers match, then an arbitrary one is returned.
 *  
 * @example
 * var cov = ...
 * var clazz = getLayerClass(cov)
 * if (clazz) {
 *   var layer = new clazz(cov, {keys: ['temperature']}).addTo(map)
 * }
 * 
 * @param {object} cov The coverage data object.
 * @return {class|undefined} The layer class.
 */
export function getLayerClass (cov) {
  if ((cov.type === COVERAGE || cov.type === DOMAIN ) && cov.domainType in DOMAIN_LAYER_CLASSES) {
    return DOMAIN_LAYER_CLASSES[cov.domainType]
  }
  if (cov.type === COVERAGECOLLECTION && cov.domainType in COLLECTION_LAYER_CLASSES) {
    return COLLECTION_LAYER_CLASSES[cov.domainType]
  }
}
