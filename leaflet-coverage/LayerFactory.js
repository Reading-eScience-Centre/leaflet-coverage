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
  if (options.renderer) {
    return (cov, opts) => new options.renderer(cov, opts)
  }
  if (options.renderers) {
    return (cov, opts) => {
      if (options.renderers[cov.type]) {
        return new options.renderers[cov.type](cov, opts)
      }
      if (options.renderers[cov.domainType]) {
        return new options.renderers[cov.domainType](cov, opts)
      }
      throw new Error(`No renderer found for type=${cov.type} or domainType=${cov.domainType},
                       available: ${Object.keys(options.renderers)}`)
    }
  }
  return (cov, opts) => {
    if (!DEFAULT_RENDERERS[cov.domainType]) {
      throw new Error(`No renderer found for domainType=${cov.domainType},
          available: ${Object.keys(DEFAULT_RENDERERS)}`)
    }
    return new DEFAULT_RENDERERS[cov.domainType](cov, opts)
  }
}