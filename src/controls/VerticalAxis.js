import L from 'leaflet'

import Dropdown from './Dropdown.js'
import EventMixin from '../util/EventMixin.js'
import {getLanguageString, stringifyUnit} from 'covutils'

/**
 * Displays a simple vertical coordinate dropdown selector for a coverage data layer.
 * 
 * @example <caption>Coverage data layer</caption>
 * new C.VerticalAxis(covLayer).addTo(map)
 * // Selecting a vertical coordinate automatically sets the 'vertical' property in the layer.
 * // Similarly, when the layer fires an 'axisChange' event with {axis: 'vertical'}
 * // the control reflects that change.
 * 
 * @example <caption>Fake layer</caption>
 * var heights = [0,10,20,50,100,500,1000]
 * var fakeLayer = {
 *   verticalSlices: heights,
 *   vertical: heights[1], // select the second height step initially
 *   crsVerticalAxis: {
 *     name: { 
 *       en: 'Gravity-related height'
 *     },
 *     unit: {
 *       symbol: 'm'
 *     }
 *   }
 * }
 * var verticalAxis = new C.VerticalAxis(fakeLayer).addTo(map)
 * 
 * // change the height and trigger a manual update
 * fakeLayer.vertical = heights[0]
 * verticalAxis.update()
 */
export default class VerticalAxis extends L.Layer {
  
  /**
   * Creates a time axis control.
   * 
   * @param {object} covLayer 
   *   The coverage data layer, or any object with <code>verticalSlices</code>
   *   and <code>vertical</code> properties, optionally <code>crsVerticalAxis</code> property.
   *   If the object has <code>on</code>/<code>off</code> methods, then the control will
   *   listen for <code>"axisChange"</code> events with <code>{axis: 'vertical'}</code>
   *   and update itself automatically.
   *   If the layer fires a <code>"remove"</code> event, then the control will remove itself
   *   from the map.
   * @param {object} [options] Control options.
   * @param {string} [options.position='topleft'] The initial position of the control (see Leaflet docs).
   * @param {string} [options.title='Vertical'] 
   *   The label to show above the control if <code>covLayer.crsVerticalAxis.name</code> is missing.
   * 
   */
  constructor (covLayer, options = {}) {
    super()
    this._covLayer = covLayer
    this._title = options.title || 'Vertical'
    this._position = options.position || 'topleft'

    if (covLayer.on) {
      this._remove = () => this.remove()
      covLayer.on('remove', this._remove)
      
      this._axisListener = e => {
        if (e.axis === 'vertical') this.update()
      }
    }
  }
  
  /**
   * @ignore
   */
  onAdd (map) {
    this._map = map
    
    if (this._covLayer.on) {
      this._covLayer.on('axisChange', this._axisListener)
    }
    
    let crsVertAxis = this._covLayer.crsVerticalAxis || {}
    let title = crsVertAxis.name ? getLanguageString(crsVertAxis.name) : this._title
    let unit = stringifyUnit(crsVertAxis.unit)
    if (unit) {
      unit = ' ' + unit
    }
    
    let choices = []
    let vals = this._covLayer.verticalSlices
    for (let i=0; i < vals.length; i++) {
      choices.push({
        value: i.toString(),
        label: vals[i] + unit
      })
    }
      
    this._dropdown = new Dropdown(choices, {
      position: this._position,
      title,
      value: this._getVerticalIndex().toString()
    }).on('change', event => {
      let i = parseInt(event.value)
      let val = this._covLayer.verticalSlices[i]
      this._covLayer.vertical = val
      this.fire('change', {vertical: val})
    }).addTo(map)
  }
  
  /**
   * @ignore
   */
  onRemove (map) {
    this._dropdown.remove()
    if (this._covLayer.off) {
      this._covLayer.off('remove', this._remove)
      this._covLayer.off('axisChange', this._axisListener)
    }
  }
    
  _getVerticalIndex () {
    let vals = this._covLayer.verticalSlices
    let i = vals.indexOf(this._covLayer.vertical)
    return i
  }
  
  /**
   * Triggers a manual update of the vertical axis control based on the
   * <code>vertical</code> property of the layer.
   * 
   * Useful if the supplied coverage data layer is not a real layer
   * and won't fire the necessary events for automatic updates.
   */
  update () {
    let i = this._getVerticalIndex()
    this._dropdown.value = i.toString()
  }
    
}
