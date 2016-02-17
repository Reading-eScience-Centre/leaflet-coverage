import Grid from './layers/Grid.js'
import Trajectory from './layers/Trajectory.js'
import Point from './layers/Point.js'
import PointCollection from './layers/PointCollection.js'
import VerticalProfile from './layers/VerticalProfile.js'
import VerticalProfileCollection from './layers/VerticalProfileCollection.js'
import MultiPolygon from './layers/MultiPolygon.js'
import {
  COVJSON_POINT, 
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
  [COVJSON_VERTICALPROFILE]: VerticalProfile,
  [COVJSON_TRAJECTORY]: Trajectory,
  [COVJSON_MULTIPOLYGON]: MultiPolygon 
}
  
const DEFAULT_COLLECTION_LAYER_CLASSES = {
  [COVJSON_POINTCOLLECTION]: PointCollection,
  [COVJSON_VERTICALPROFILECOLLECTION]: VerticalProfileCollection 
}

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
 * Return a layer class usable for the given coverage,
 * or null if none was found.
 * If multiple layers match, then an arbitrary is returned. 
 */
export function getLayerClass (cov, options={}) {
  if (options.classes) {
    if (cov.profiles.some(p => options.classes[p])) {
      return options.classes[cov.profiles.find(p => options.classes[p])]
    }
    if (cov.domainProfiles.some(p => options.classes[p])) {
      return options.classes[cov.domainProfiles.find(p => options.classes[p])]
    }
  }
  if (cov.domainProfiles.some(p => DEFAULT_DOMAIN_LAYER_CLASSES[p])) {
    return DEFAULT_DOMAIN_LAYER_CLASSES[cov.domainProfiles.find(p => DEFAULT_DOMAIN_LAYER_CLASSES[p])]
  }
  if (cov.profiles.some(p => DEFAULT_COLLECTION_LAYER_CLASSES[p])) {
    return DEFAULT_COLLECTION_LAYER_CLASSES[cov.profiles.find(p => DEFAULT_COLLECTION_LAYER_CLASSES[p])]
  }
  return null
}
