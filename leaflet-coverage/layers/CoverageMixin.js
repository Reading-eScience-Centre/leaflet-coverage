import * as referencingutil from '../util/referencing.js'

/**
 * A mixin that encapsulates loading of a single coverage for use in layers.
 * 
 * The base class must supply the following functions/properties:
 * 
 * .coverage
 * .parameter (optional)
 * ._subsetByCoordinatePreference() (optional)
 * 
 * The following functions/properties are supplied:
 * 
 * .domain (after calling load())
 * .range (after calling load(); only if .parameter is set and ._subsetByCoordinatePreference is undefined)
 * 
 * @param {class} base The base class.
 * @return {class} The base class with CoverageMixin.
 */
export default function CoverageMixin (base) {
  return class extends base {
    /**
     * Load all data without adding anything to the map.
     * After loading is done, all functions and properties can be accessed (like getLatLng()).
     */
    load () {
      this.fire('dataLoading') // for supporting loading spinners
      
      function checkWGS84 (domain) {
        let srs = referencingutil.getRefSystem(domain, ['x', 'y'])
        if (!referencingutil.isGeodeticWGS84CRS(srs)) {
          throw new Error('Unsupported CRS, must be WGS84')
        }
      }
      
      let promise = this.coverage.loadDomain().then(domain => {
        checkWGS84(domain)
        this.domain = domain
      })
      if (this._subsetByCoordinatePreference) {
        promise = promise.then(() => this._subsetByCoordinatePreference())
      } else if (this.parameter) {
        promise = promise.then(() => this.coverage.loadRange(this.parameter.key)).then(range => {
          this.range = range
        })
      }
      
      promise = promise.then(() => {
        this.fire('dataLoad')
      }).catch(e => {
        console.error(e)
        this.fire('error', e)
        this.fire('dataLoad')
      })
      return promise
    }
  }
}