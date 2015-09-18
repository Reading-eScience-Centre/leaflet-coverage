import L from 'leaflet'
import MINI from 'minified' 
let $ = MINI.$

/**
 * Displays a time axis selector for a given coverage layer.
 * Also listens to time axis changes which were not initiated from
 * this control.
 * 
 *  TODO figure out for which use cases this can realistically be used
 *  solve https://github.com/Reading-eScience-Centre/coverage-jsapi/issues/3 first
 */
export default class TimeAxis extends L.Control {
  
  constructor (covLayer, options) {
    super(options.position ? {position: options.position} : {})
    this.covLayer = covLayer
    this.id = options.id || DEFAULT_TEMPLATE_ID
    
    if (!options.id && document.getElementById(DEFAULT_TEMPLATE_ID) === null) {
      inject(DEFAULT_TEMPLATE, DEFAULT_TEMPLATE_CSS)
    }

    this._axisListener = e => {
      if (e.axis === 'time') this.updateAxis()
    }
    covLayer.on('axisChange', this._axisListener)

    covLayer.on('remove', () => {
      this.remove()
    })
  }
  
  onRemove (map) {
    covLayer.off('axisChange', this._axisListener)
  }
  
  onAdd (map) {

    let el = document.importNode($('#' + this.id)[0], true).firstChild
    this._el = el
    this.updateAxis()
    
    return el
  }
  
  updateAxis () {
    // TODO implement
  }
  
}