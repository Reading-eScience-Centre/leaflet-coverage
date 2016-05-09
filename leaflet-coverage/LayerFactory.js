import Grid from './layers/Grid.js'
import Trajectory from './layers/Trajectory.js'
import Point from './layers/Point.js'
import PointSeries from './layers/PointSeries.js'
import PointCollection from './layers/PointCollection.js'
import VerticalProfile from './layers/VerticalProfile.js'
import VerticalProfileCollection from './layers/VerticalProfileCollection.js'
import MultiPolygon from './layers/MultiPolygon.js'
import {
  COVJSON_POINT, 
  COVJSON_POINTSERIES, 
  COVJSON_VERTICALPROFILE, 
  COVJSON_GRID, 
  COVJSON_TRAJECTORY, 
  COVJSON_MULTIPOLYGON,
  COVJSON_VERTICALPROFILECOLLECTION,
  COVJSON_POINTCOLLECTION
  } from './util/constants.js'

const DEFAULT_DOMAIN_LAYER_CLASSES = {
  [COVJSON_GRID]: Grid,
  [COVJSON_POINT]: Point,
  [COVJSON_POINTSERIES]: PointSeries,
  [COVJSON_VERTICALPROFILE]: VerticalProfile,
  [COVJSON_TRAJECTORY]: Trajectory,
  [COVJSON_MULTIPOLYGON]: MultiPolygon 
}
  
const DEFAULT_COLLECTION_LAYER_CLASSES = {
  [COVJSON_POINTCOLLECTION]: PointCollection,
  [COVJSON_VERTICALPROFILECOLLECTION]: VerticalProfileCollection 
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
 * @param {object} [options] Options for influencing the layer class matching algorithm.
 * @param {object} [options.classes] An object that maps profile URIs to layer classes.
 *   Those classes are preferred over the default layer classes.
 * @return {function} A function fn(cov, options) which returns a new layer for
 *   the given coverage data object and which is initialized with the given layer options.
 * @throws {Error} If no layer class could be found.
 */
export default function LayerFactory (options={}) {
  return (cov, opts) => {
    let clazz = getLayerClass(cov, options)
    if (!clazz) {
      throw new Error(`No layer class found for profiles=${cov.profiles} or domainProfiles=${cov.domainProfiles}`)
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
 * @param {object} [options] Options for influencing the matching algorithm.
 * @param {object} [options.classes] An object that maps profile URIs to layer classes.
 *   Those classes are preferred over the default layer classes.
 * @return {class|undefined} The layer class.
 */
export function getLayerClass (cov, options={}) {
  if (options.classes) {
    if (cov.profiles.some(p => options.classes[p])) {
      return options.classes[cov.profiles.find(p => options.classes[p])]
    }
    // domainProfiles is not defined for collections, hence the check
    if (cov.domainProfiles && cov.domainProfiles.some(p => options.classes[p])) {
      return options.classes[cov.domainProfiles.find(p => options.classes[p])]
    }
  }
  if (cov.type === 'Coverage' && cov.domainProfiles && cov.domainProfiles.some(p => DEFAULT_DOMAIN_LAYER_CLASSES[p])) {
    return DEFAULT_DOMAIN_LAYER_CLASSES[cov.domainProfiles.find(p => DEFAULT_DOMAIN_LAYER_CLASSES[p])]
  }
  if (cov.type === 'Domain' && cov.profiles && cov.profiles.some(p => DEFAULT_DOMAIN_LAYER_CLASSES[p])) {
    return DEFAULT_DOMAIN_LAYER_CLASSES[cov.profiles.find(p => DEFAULT_DOMAIN_LAYER_CLASSES[p])]
  }
  if (cov.type === 'CoverageCollection' && cov.profiles.some(p => DEFAULT_COLLECTION_LAYER_CLASSES[p])) {
    return DEFAULT_COLLECTION_LAYER_CLASSES[cov.profiles.find(p => DEFAULT_COLLECTION_LAYER_CLASSES[p])]
  }
}
