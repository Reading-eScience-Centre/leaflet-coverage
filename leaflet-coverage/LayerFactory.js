import Grid from './renderers/Grid.js'
import Trajectory from './renderers/Trajectory.js'
import VerticalProfile from './renderers/VerticalProfile.js'
import MultiPolygon from './renderers/MultiPolygon.js'

const pre = 'http://coveragejson.org/def#'
export const DEFAULT_RENDERERS = {
    [pre + 'Grid']: Grid,
    [pre + 'VerticalProfile']: VerticalProfile,
    [pre + 'Trajectory']: Trajectory,
    [pre + 'MultiPolygon']: MultiPolygon
}

export default function LayerFactory (options={}) {
  return (cov, opts) => {
    let rendererClass = getLayerClass(cov, options)
    if (!rendererClass) {
      throw new Error(`No renderer found for type=${cov.type} or domainType=${cov.domainType},
            available: ${Object.keys(DEFAULT_RENDERERS)}, ${Object.keys(options.renderers)}`)
    }
    return new rendererClass(cov, opts)
  }
}

/**
 * Return a layer class usable for the given coverage,
 * or null if none was found.
 */
export function getLayerClass (cov, options={}) {
  if (options.renderers) {
    if (options.renderers[cov.type]) {
      return options.renderers[cov.type]
    }
    if (options.renderers[cov.domainType]) {
      return options.renderers[cov.domainType]
    }
  }
  if (DEFAULT_RENDERERS[cov.domainType]) {
    return DEFAULT_RENDERERS[cov.domainType]
  }
  return null
}
