import L from 'leaflet'

import {$$, fromTemplate, HTML} from './utils.js'
import {EventMixin} from '../util/EventMixin.js'

const DEFAULT_TEMPLATE_ID = 'template-coverage-timeaxis'
const DEFAULT_TEMPLATE = `<template id="${DEFAULT_TEMPLATE_ID}">
<div class="leaflet-coverage-control form-inline" style="clear:none">
  <strong class="title">Time</strong><br>
  <div class="form-group">
    <select name="date" class="date form-control"></select>
  </div>
  <div class="form-group">
    <select name="time" class="time form-control"></select>
  </div>
</div>
</template>`

/**
 * The `change` event, signalling that a different time entry has been selected.
 * 
 * @typedef {L.Event} TimeAxis#change
 * @property {Date} time The time that has been selected.
 */

/**
 * Displays a simple date/time picker for a coverage data layer by grouping
 * time steps into dates and times.
 * 
 * @example <caption>Coverage data layer</caption>
 * new C.TimeAxis(covLayer).addTo(map)
 * // Selecting a date/time automatically sets the 'time' property in the layer.
 * // Similarly, when the layer fires an 'axisChange' event with {axis: 'time'}
 * // the control reflects that change.
 * 
 * @example <caption>Fake layer</caption>
 * var times = ['2000-01-01T00:00:00Z','2000-01-01T05:00:00Z'].map(s => new Date(s))
 * var fakeLayer = {
 *   timeSlices: times,
 *   time: times[1] // select the second time step initially
 * }
 * var timeAxis = new C.TimeAxis(fakeLayer).addTo(map)
 * 
 * // change the time and trigger a manual update
 * fakeLayer.time = times[0]
 * timeAxis.update()
 * 
 * @extends {L.Control}
 * @extends {EventMixin}
 * 
 * @emits {TimeAxis#change} when a different time entry has been selected
 */
export class TimeAxis extends EventMixin(L.Control) {
  
  /**
   * Creates a time axis control.
   * 
   * @param {object} covLayer 
   *   The coverage data layer, or any object with `timeSlices` and `time` properties.
   *   If the object has `on`/`off` methods, then the control will
   *   listen for `axisChange` events with `{axis: 'time'}` and update itself automatically.
   *   If the layer fires a `remove` event, then the control will remove itself from the map.
   * @param {object} [options] Control options.
   * @param {string} [options.position='topleft'] The initial position of the control (see Leaflet docs).
   * @param {string} [options.title='Time'] The label to show above the date/time picker.
   * @param {string} [options.templateId] Element ID of an alternative HTML `<template>` element to use.
   */
  constructor (covLayer, options = {}) {
    super({position: options.position || 'topleft'})
    this._templateId = options.templateId || DEFAULT_TEMPLATE_ID
    this._title = options.title || 'Time'
    this._covLayer = covLayer

    if (!options.templateId && document.getElementById(DEFAULT_TEMPLATE_ID) === null) {
      inject(DEFAULT_TEMPLATE)
    } 

    if (covLayer.on) {
      this._remove = () => this.remove()
      covLayer.on('remove', this._remove)
      
      this._axisListener = e => {
        if (e.axis === 'time') this.update()
      }
    }
    
    let timeSlices = this._covLayer.timeSlices
    let dateMap = new Map() // UTC timestamp (representing the date only) -> array of Date objects
    for (let t of timeSlices) {
      let dateTimestamp = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate())).getTime()
      if (!dateMap.has(dateTimestamp)) {
        dateMap.set(dateTimestamp, [])
      }
      dateMap.get(dateTimestamp).push(t)
    }
    this._dateMap = dateMap
  }
  
  /**
   * @ignore
   */
  onAdd (map) {
    this._map = map
    
    if (this._covLayer.on) {
      this._covLayer.on('axisChange', this._axisListener)
    }
    
    let el = fromTemplate(this._templateId)
    this._el = el
    L.DomEvent.disableClickPropagation(el)
    
    if (this._title) {
      $$('.title', el).innerHTML = this._title
    }
    
    for (let dateTimestamp of this._dateMap.keys()) {
      let dateStr = getUTCDateString(dateTimestamp)
      $$('.date', el).appendChild(HTML(`<option value="${dateStr}">${dateStr}</option>`))
    }
    $$('.date', el).disabled = this._dateMap.size === 1
    
    $$('.date', el).addEventListener('change', event => {
      let dateTimestamp = getUTCTimestampDateOnly(event.target.value)
      let timeSlice = this._dateMap.get(dateTimestamp)[0]
      this._covLayer.time = timeSlice
      this._initTimeSelect(dateTimestamp)
      this.fire('change', {time: timeSlice})
    })
    $$('.time', el).addEventListener('change', event => {
      let dateStr = $$('.date', el).value
      let timeStr = event.target.value
      let time = new Date(dateStr + 'T' + timeStr)
      this._covLayer.time = time
      this.fire('change', {time: time})
    })
    
    this.update()
    
    return el
  }
  
  /**
   * @ignore
   */
  onRemove () {
    if (this._covLayer.off) {
      this._covLayer.off('remove', this._remove)
      this._covLayer.off('axisChange', this._axisListener)
    }
  }
  
  /**
   * Triggers a manual update of the date/time picker based on the
   * `time` property of the layer.
   * 
   * Useful if the supplied coverage data layer is not a real layer
   * and won't fire the necessary events for automatic updates.
   */
  update () {
    let covTime = this._covLayer.time
    if (!covTime) return
    let el = this._el
    // selects the date set in the cov layer, populates the time select, and selects the time
    let dateTimestamp = getUTCTimestampDateOnly(covTime.toISOString())
    let dateStr = getUTCDateString(dateTimestamp)
    $$('.date', el).value = dateStr 
    
    this._initTimeSelect(dateTimestamp)
    
    let timeStr = covTime.toISOString().substr(11)
    $$('.time', el).value = timeStr
  }
  
  _initTimeSelect (dateTimestamp) {
    let el = this._el
    let timeSelect = $$('.time', el)
    timeSelect.innerHTML = ''
    let times = this._dateMap.get(dateTimestamp)
    for (let timeSlice of times) {
      let timeStr = timeSlice.toISOString().substr(11)
      timeSelect.appendChild(HTML(`<option value="${timeStr}">${timeStr}</option>`))
    }
    timeSelect.disabled = times.length === 1
  }
    
}

function getUTCTimestampDateOnly (dateStr) {
  let year = parseInt(dateStr.substr(0, 4))
  let month = parseInt(dateStr.substr(5, 2))
  let day = parseInt(dateStr.substr(8, 2))
  return Date.UTC(year, month-1, day)
}

function getUTCDateString (timestamp) {
  let iso = new Date(timestamp).toISOString()
  let date = iso.substr(0, 10)
  return date
}

