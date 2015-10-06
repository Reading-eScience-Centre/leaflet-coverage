import L from 'leaflet'
import {$,HTML} from 'minified'

import {inject} from './utils.js'
import * as i18n from '../util/i18n.js'

// TODO the default template should be moved outside this module so that it can be easily skipped
const DEFAULT_TEMPLATE_ID = 'template-coverage-parameter-discrete-legend'
const DEFAULT_TEMPLATE = `
<template id="${DEFAULT_TEMPLATE_ID}">
  <div class="info legend">
    <strong class="legend-title"></strong><br>
    <div class="info legend legend-palette"></div>
  </div>
</template>
`
const DEFAULT_TEMPLATE_CSS = `
.legend {
  text-align: left;
  line-height: 18px;
  color: #555;
}
.legend i {
  float: left;
  height: 18px;
  margin-right: 8px;
  opacity: 0.7;
  width: 18px;
}
`

/**
 * Displays a discrete palette legend for the parameter displayed by the given
 * Coverage layer. Supports category parameters only at the moment.
 * 
 * @example
 * new DiscreteLegend(covLayer).addTo(map)
 * 
 * @example <caption>Fake layer</caption>
 * var legend = new DiscreteLegend({parameter: {..}, palette: {...}}).addTo(map)
 * 
 * // either recreate the legend or update the fake layer in place:
 * legend.covLayer = {..}
 * legend.updateLegend()
 */
export default class DiscreteLegend extends L.Control {
  
  constructor (covLayer, options) {
    super(options.position ? {position: options.position} : {})
    this.covLayer = covLayer
    this.id = options.id || DEFAULT_TEMPLATE_ID
    this.language = options.language || i18n.DEFAULT_LANGUAGE
    
    if (!options.id && document.getElementById(DEFAULT_TEMPLATE_ID) === null) {
      inject(DEFAULT_TEMPLATE, DEFAULT_TEMPLATE_CSS)
    }   

    if (covLayer.on) {
      // arrow function is broken here with traceur, this is a workaround
      // see https://github.com/google/traceur-compiler/issues/1987
      let self = this
      this._remove = function () {
        self.removeFrom(self._map)
      }
      covLayer.on('remove', this._remove)
    }
  }
  
  updateLegend () {
    let el = this._el
    
    let palette = this.covLayer.palette
    let param = this.covLayer.parameter
    
    let html = ''
    
    for (let i=0; i < palette.steps; i++) {
      let cat = i18n.getLanguageString(param.categories[i].label, this.language)
      html += `
        <i style="background:rgb(${palette.red[i]}, ${palette.green[i]}, ${palette.blue[i]})"></i>
        ${cat}
        <br>`
    }
    
    $('.legend-palette', el).fill(HTML(html))
  }
  
  onRemove (map) {
    if (this.covLayer.off) {
      this.covLayer.off('remove', this._remove)
      this.covLayer.off('paletteChange', () => this.updateLegend())
    }
  }
  
  onAdd (map) {
    this._map = map
    
    if (this.covLayer.on) {
      this.covLayer.on('paletteChange', () => this.updateLegend())
    }
    
    let param = this.covLayer.parameter
    // if requested language doesn't exist, use the returned one for all other labels
    this.language = i18n.getLanguageTag(param.observedProperty.label, this.language) 
    let title = i18n.getLanguageString(param.observedProperty.label, this.language)
    
    let el = document.importNode($('#' + this.id)[0].content, true).children[0]
    this._el = el
    $('.legend-title', el).fill(title)
    this.updateLegend()
    
    return el
  }
  
}
