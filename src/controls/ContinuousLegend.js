import L from 'leaflet'

import {inject, fromTemplate, $$, $} from './utils.js'
import {getLanguageTag, getLanguageString, stringifyUnit} from 'covutils'

const DEFAULT_TEMPLATE_ID = 'template-coverage-parameter-continuous-legend'
const DEFAULT_TEMPLATE = `<template id="${DEFAULT_TEMPLATE_ID}">
  <div class="leaflet-coverage-control legend continuous-legend">
    <div style="margin-bottom:3px" class="legend-title-container">
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
</template>`

/**
 * Displays a continuous legend for the parameter displayed by the given
 * coverage data layer.
 * 
 * Note that this class should only be used if the palette is continuous
 * by nature, typically having at least 100-200 color steps.
 * If there are only a few color steps (e.g. 10), then this class
 * will still show a continuous legend due to its rendering technique
 * (CSS gradient based).
 * 
 * @example <caption>Coverage data layer</caption>
 * new C.ContinuousLegend(covLayer).addTo(map)
 * // changing the palette of the layer automatically updates the legend 
 * covLayer.palette = C.linearPalette(['blue', 'red'])
 * 
 * @example <caption>Fake layer</caption>
 * var fakeLayer = {
 *   parameter: {
 *     observedProperty: {
 *       label: { en: 'Temperature' }
 *     },
 *     unit: {
 *       symbol: { value: 'K' },
 *       label: { en: 'Kelvin' }
 *     }
 *   },
 *   palette: linearPalette(['#FFFFFF', '#000000']),
 *   paletteExtent: [0, 10]
 * }
 * var legend = new C.ContinuousLegend(fakeLayer).addTo(map)
 * 
 * // change the palette and trigger a manual update
 * fakeLayer.palette = C.linearPalette(['blue', 'red'])
 * legend.update()
 */
export default class ContinuousLegend extends L.Control {
  
  /**
   * Creates a continuous legend control.
   * 
   * @param {object} covLayer 
   *   The coverage data layer, or any object with <code>palette</code>,
   *   <code>paletteExtent</code>, and <code>parameter</code> properties.
   *   If the object has <code>on</code>/<code>off</code> methods, then the legend will
   *   listen for <code>"paletteChange"</code> and <code>"paletteExtentChange"</code>
   *   events and update itself automatically.
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
      let language = getLanguageTag(param.observedProperty.label, this._language) 
      let title = getLanguageString(param.observedProperty.label, language)
      let unit = stringifyUnit(param.unit, language)
       $$('.legend-title', el).innerHTML = title
       $('.legend-uom', el).forEach(u => u.innerHTML = unit)        
    }
    
    let palette = this._covLayer.palette
    let [low,high] = this._covLayer.paletteExtent
    
    $$('.legend-min', el).innerHTML = low.toFixed(2)
    $$('.legend-max', el).innerHTML = high.toFixed(2)

    let gradient = ''
    for (let i = 0; i < palette.steps; i++) {
      if (i > 0) gradient += ','
      gradient += 'rgb(' + palette.red[i] + ',' + palette.green[i] + ',' + palette.blue[i] + ')'
    }
    
    $$('.legend-palette', el).style.background = 'transparent linear-gradient(to top, ' + gradient + ') repeat scroll 0% 0%'
  }
  
  /**
   * @ignore
   */
  onAdd (map) {
    this._map = map
    
    if (this._covLayer.on) {
      this._covLayer.on('paletteChange', this._update)
      this._covLayer.on('paletteExtentChange', this._update)
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
      this._covLayer.off('paletteExtentChange', this._update)
    }
  }
  
}
