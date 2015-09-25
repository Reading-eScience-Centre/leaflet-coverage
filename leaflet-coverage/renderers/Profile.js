import L from 'leaflet'

const DOMAIN_TYPE = 'http://coveragejson.org/def#Profile'

/**
 * Renderer for Coverages with domain type Profile.
 * 
 * This will simply display a dot on the map and fire a click
 * event when a user clicks on it.
 * The dot either has a defined standard color, or it uses
 * a palette together with a target depth.
 */
export default class Profile extends L.CircleMarker {
  
  constructor(cov, options) {
    super()
    if (cov.domainType !== DOMAIN_TYPE) {
      throw new Error('Unsupported domain type: ' + cov.domainType + ', must be: ' + DOMAIN_TYPE)
    }
    this.cov = cov
    this.param = cov.parameters.get(options.keys[0])
  }
  
  onAdd(map) {
    
  }
  
  onRemove (map) {
    
  }
  
}