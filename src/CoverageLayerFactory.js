import GridCoverage from 'renderers/GridCoverage'
import TrajectoryCoverage from 'renderers/TrajectoryCoverage'
import ProfileCoverage from 'renderers/ProfileCoverage'

const pre = 'http://coveragejson.org/def#'
export const DEFAULT_RENDERERS = {
    [pre + 'Grid']: GridCoverage,
    [pre + 'Profile']: ProfileCoverage,
    [pre + 'Trajectory']: TrajectoryCoverage
}

export default function LayerFactory (options) {
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