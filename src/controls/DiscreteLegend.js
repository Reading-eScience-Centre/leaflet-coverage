import L from 'leaflet'

import {inject, fromTemplate, $$} from './utils.js'
import {getLanguageTag, getLanguageString} from 'covutils'

const DEFAULT_TEMPLATE_ID = 'template-coverage-parameter-discrete-legend'
const DEFAULT_TEMPLATE = `<template id="${DEFAULT_TEMPLATE_ID}">
  <div class="leaflet-coverage-control legend discrete-legend">
    <div class="legend-title-container"><strong class="legend-title"></strong></div>
    <div class="legend-palette discrete-legend-palette"></div>
  </div>
</template>`

/**
 * Displays a discrete palette legend for the parameter displayed by the given
 * Coverage layer. Supports category parameters only at the moment.
 * 
 * @example <caption>Coverage data layer</caption>
 * new C.DiscreteLegend(covLayer).addTo(map)
 * // changing the palette of the layer automatically updates the legend 
 * covLayer.palette = C.discretePalette(['red', 'blue'])
 * 
 * @example <caption>Fake layer</caption>
 * var fakeLayer = {
 *   parameter: {
 *     observedProperty: {
 *       label: { en: 'Land cover' },
 *       categories: [{
 *         label: { en: 'Land' }
 *       }, {
 *         label: { en: 'Water' }
 *       }]
 *     }
 *   },
 *   palette: C.directPalette(['gray', 'blue']) // CSS colors in category order
 * }
 * var legend = new C.DiscreteLegend(fakeLayer).addTo(map)
 * 
 * // change the palette and trigger a manual update
 * fakeLayer.palette = C.discretePalette(['red', 'blue'])
 * legend.update()
 */
export default class DiscreteLegend extends L.Control {
  
  /**
   * Creates a discrete legend control.
   * 
   * @param {object} covLayer 
   *   The coverage data layer, or any object with <code>palette</code>
   *   and <code>parameter</code> properties.
   *   If the object has <code>on</code>/<code>off</code> methods, then the legend will
   *   listen for <code>"paletteChange"</code> events and update itself automatically.
   *   If the layer fires a <code>"remove"</code> event, then the legend will remove itself
   *   from the map. 
   * @param {object} [options] Legend options.
   * @param {string} [options.position='bottomright'] The initial position of the control (see Leaflet docs).
   * @param {string} [options.language] A language tag, indicating the preferred language to use for labels.
   * @param {string} [options.id] Uses the HTML element with the given id as template.
   */
  constructor (covLayer, options = {}) {
    super({position: options.position || 'bottomright'})
    this._covLayer = covLayer
    this._id = options.id || DEFAULT_TEMPLATE_ID
    this._language = options.language
    
    if (!options.id && document.getElementById(DEFAULT_TEMPLATE_ID) === null) {
      inject(DEFAULT_TEMPLATE)
    }   

    if (covLayer.on) {
      this._remove = () => this.remove()
      this._update = () => this._doUpdate(false)
      covLayer.on('remove', this._remove)
    }
  }
  
  /**
   * Triggers a manual update of the legend.
   * 
   * Useful if the supplied coverage data layer is not a real layer
   * and won't fire the necessary events for automatic updates.
   */
  update () {
    this._doUpdate(true)
  }
  
  _doUpdate (fullUpdate) {
    let el = this._el
    
    if (fullUpdate) {
      let param = this._covLayer.parameter
      // if requested language doesn't exist, use the returned one for all other labels
      this._language = getLanguageTag(param.observedProperty.label, this._language) 
      let title = getLanguageString(param.observedProperty.label, this._language)
      $$('.legend-title', el).innerHTML = title
    }
    
    let palette = this._covLayer.palette
    let param = this._covLayer.parameter
    
    let html = ''
    for (let i=0; i < palette.steps; i++) {
      let cat = getLanguageString(param.observedProperty.categories[i].label, this._language)
      html += `
        <i style="background:rgb(${palette.red[i]}, ${palette.green[i]}, ${palette.blue[i]})"></i>
        ${cat}
        <br>`
    }
    
    $$('.legend-palette', el).innerHTML = html
  }
  
  /**
   * @ignore
   */
  onAdd (map) {
    this._map = map
    
    if (this._covLayer.on) {
      this._covLayer.on('paletteChange', this._update)
    }
    
    this._el = fromTemplate(this._id)
    this.update()
    return this._el
  }
  
  /**
   * @ignore
   */
  onRemove () {
    if (this._covLayer.off) {
      this._covLayer.off('remove', this._remove)
      this._covLayer.off('paletteChange', this._update)
    }
  }
}
