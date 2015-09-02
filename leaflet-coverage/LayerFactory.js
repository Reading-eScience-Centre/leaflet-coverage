import Grid from './renderers/Grid.js'
import Trajectory from './renderers/Trajectory.js'
import Profile from './renderers/Profile.js'

const pre = 'http://coveragejson.org/def#'
export const DEFAULT_RENDERERS = {
    [pre + 'Grid']: Grid,
    [pre + 'Profile']: Profile,
    [pre + 'Trajectory']: Trajectory
}

export default function LayerFactory (options={}) {
  if (options.renderer) {
    return (cov, opts) => new options.renderer(cov, opts)
  }
  if (options.renderers) {
    return (cov, opts) => options.renderers[cov.type]? 
                          new options.renderers[cov.type](cov, opts) :
                          new options.renderers[cov.domainType](cov, opts)
  }
  return (cov, opts) => new DEFAULT_RENDERERS[cov.domainType](cov, opts)
}