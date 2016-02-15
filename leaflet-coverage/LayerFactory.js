import Grid from './renderers/Grid.js'
import Trajectory from './renderers/Trajectory.js'
import VerticalProfile from './renderers/VerticalProfile.js'
import VerticalProfileCollection from './renderers/VerticalProfileCollection.js'
import MultiPolygon from './renderers/MultiPolygon.js'
import {COVJSON_VERTICALPROFILE, COVJSON_GRID, COVJSON_TRAJECTORY, COVJSON_MULTIPOLYGON,
  COVJSON_VERTICALPROFILECOLLECTION}
  from './util/constants.js'

const DEFAULT_DOMAIN_RENDERERS = {
    [COVJSON_GRID]: Grid,
    [COVJSON_VERTICALPROFILE]: VerticalProfile,
    [COVJSON_TRAJECTORY]: Trajectory,
    [COVJSON_MULTIPOLYGON]: MultiPolygon 
}
  
const DEFAULT_COLLECTION_RENDERERS = {
    [COVJSON_VERTICALPROFILECOLLECTION]: VerticalProfileCollection 
}

export default function LayerFactory (options={}) {
  return (cov, opts) => {
    let rendererClass = getLayerClass(cov, options)
    if (!rendererClass) {
      throw new Error(`No renderer found for profiles=${cov.profiles} or domainProfiles=${cov.domainProfiles}`)
    }
    return new rendererClass(cov, opts)
  }
}

/**
 * Return a layer class usable for the given coverage,
 * or null if none was found.
 * If multiple renderers match, then an arbitrary is returned. 
 */
export function getLayerClass (cov, options={}) {
  if (options.renderers) {
    if (cov.profiles.some(p => options.renderers[p])) {
      return options.renderers[cov.profiles.find(p => options.renderers[p])]
    }
    if (cov.domainProfiles.some(p => options.renderers[p])) {
      return options.renderers[cov.domainProfiles.find(p => options.renderers[p])]
    }
  }
  if (cov.domainProfiles.some(p => DEFAULT_DOMAIN_RENDERERS[p])) {
    return DEFAULT_DOMAIN_RENDERERS[cov.domainProfiles.find(p => DEFAULT_DOMAIN_RENDERERS[p])]
  }
  if (cov.profiles.some(p => DEFAULT_COLLECTION_RENDERERS[p])) {
    return DEFAULT_COLLECTION_RENDERERS[cov.profiles.find(p => DEFAULT_COLLECTION_RENDERERS[p])]
  }
  return null
}
