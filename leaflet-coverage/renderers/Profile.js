import L from 'leaflet'

const DOMAIN_TYPE = 'http://coveragejson.org/def#Profile'

/**
 * Renderer for Coverages with domain type Profile.
 * TODO maybe just wrap the ProfileCoverageCollection renderer
 */
export default class Profile {
  
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