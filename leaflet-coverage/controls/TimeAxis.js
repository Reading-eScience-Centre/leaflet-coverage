import L from 'leaflet'
import {$} from 'minified'

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

    // arrow function is broken here with traceur, this is a workaround
    // see https://github.com/google/traceur-compiler/issues/1987
    let self = this
    this._remove = function () {
      self.removeFrom(self._map)
    }
    covLayer.on('remove', this._remove)
  }
    
  onRemove (map) {
    this.covLayer.off('remove', this._remove)
    this.covLayer.off('axisChange', this._axisListener)
  }
  
  onAdd (map) {
    this._map = map
    covLayer.on('axisChange', this._axisListener)
    let el = document.importNode($('#' + this.id)[0].content, true).children[0]
    this._el = el
    this.updateAxis()
    
    return el
  }
  
  updateAxis () {
    // TODO implement
  }
  
}