import L from 'leaflet'

const DOMAIN_TYPE = 'http://coveragejson.org/def#Trajectory'

/**
 * Renderer for Coverages with domain type Trajectory.
 */
export default class Trajectory {
  
  constructor(cov, options) {
    if (cov.domainType !== DOMAIN_TYPE) {
      throw new Error('Unsupported domain type: ' + cov.domainType + ', must be: ' + DOMAIN_TYPE)
    }
    this.cov = cov
    this.param = options.parameters[0]
  }
  
  onAdd(map) {
    
  }
  
  onRemove (map) {
    
  }
  
}