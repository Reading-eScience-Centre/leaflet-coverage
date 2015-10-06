import L from 'leaflet'
import {$} from 'minified' 

import {inject} from './utils.js'
import * as i18n from '../util/i18n.js'

// TODO the default template should be moved outside this module so that it can be easily skipped
const DEFAULT_TEMPLATE_ID = 'template-coverage-parameter-legend'
const DEFAULT_TEMPLATE = `
<template id="${DEFAULT_TEMPLATE_ID}">
  <div class="info legend">
    <div style="margin-bottom:3px">
      <strong class="legend-title"></strong>
    </div>
    <div style="display: inline-block; height: 144px; float:left">
      <span style="height: 136px; width: 18px; display: block; margin-top: 9px;" class="legend-palette"></span>
    </div>
    <div style="display: inline-block; float:left; height:153px">
      <table style="height: 100%;">
        <tr><td style="vertical-align:top"><span class="legend-max"></span> <span class="legend-uom"></span></td></tr>
        <tr><td><span class="legend-current"></span></td></tr>
        <tr><td style="vertical-align:bottom"><span class="legend-min"></span> <span class="legend-uom"></span></td></tr>
      </table>
    </div>
  </div>
</template>
`
const DEFAULT_TEMPLATE_CSS = `
.legend {
  text-align: left;
  line-height: 18px;
  color: #555;
}
`

/**
 * Displays a palette legend for the parameter displayed by the given
 * Coverage layer.
 */
export default class Legend extends L.Control {
  
  constructor (covLayer, options) {
    super(options.position ? {position: options.position} : {})
    this.covLayer = covLayer
    this.id = options.id || DEFAULT_TEMPLATE_ID
    this.language = options.language || i18n.DEFAULT_LANGUAGE
    
    if (!options.id && document.getElementById(DEFAULT_TEMPLATE_ID) === null) {
      inject(DEFAULT_TEMPLATE, DEFAULT_TEMPLATE_CSS)
    }   

    // arrow function is broken here with traceur, this is a workaround
    // see https://github.com/google/traceur-compiler/issues/1987
    let self = this
    this._remove = function () {
      self.removeFrom(self._map)
    }
    covLayer.on('remove', this._remove)
  }
  
  updateLegend () {
    let el = this._el
    
    let palette = this.covLayer.palette
    let [low,high] = this.covLayer.paletteExtent
    
    $('.legend-min', el).fill(low.toFixed(2))
    $('.legend-max', el).fill(high.toFixed(2))

    let gradient = ''
    for (let i = 0; i < palette.steps; i++) {
      if (i > 0) gradient += ','
      gradient += 'rgb(' + palette.red[i] + ',' + palette.green[i] + ',' + palette.blue[i] + ')'
    }
    
    $('.legend-palette', el).set('$background',
         'transparent linear-gradient(to top, ' + gradient + ') repeat scroll 0% 0%')
  }
  
  onRemove (map) {
    this.covLayer.off('remove', this._remove)
    this.covLayer.off('paletteChange', () => this.updateLegend())
    this.covLayer.off('paletteExtentChange', () => this.updateLegend())
  }
  
  onAdd (map) {
    this._map = map
    
    this.covLayer.on('paletteChange', () => this.updateLegend())
    this.covLayer.on('paletteExtentChange', () => this.updateLegend())
    
    let param = this.covLayer.parameter
    // if requested language doesn't exist, use the returned one for all other labels
    let language = i18n.getLanguageTag(param.observedProperty.label, this.language) 
    let title = i18n.getLanguageString(param.observedProperty.label, language)
    let unit = param.unit ? 
               (param.unit.symbol ? param.unit.symbol : i18n.getLanguageString(param.unit.label, language)) :
               ''
    
    let el = document.importNode($('#' + this.id)[0].content, true).children[0]
    this._el = el
    $('.legend-title', el).fill(title)
    $('.legend-uom', el).fill(unit)
    this.updateLegend()
    
    return el
  }
  
}
