import L from 'leaflet'

import {$$, HTML} from './utils.js'
import EventMixin from '../util/EventMixin.js'

let TEMPLATE = 
`<div class="info" style="clear:none">
  <strong class="title">Time</strong><br>
  <select name="date" class="date"></select>
  <select name="time" class="time"></select>
</div>`

/**
 * Displays a simple date/time picker for a coverage data layer by grouping
 * time steps into dates and times.
 * 
 * @example <caption>Coverage data layer</caption>
 * new TimeAxis(covLayer).addTo(map)
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
 * var timeAxis = new TimeAxis(fakeLayer).addTo(map)
 * 
 * // change the time and trigger a manual update
 * fakeLayer.time = times[0]
 * timeAxis.update()
 * 
 * @example <caption>Non-module access</caption>
 * L.coverage.control.TimeAxis
 */
export default class TimeAxis extends EventMixin(L.Control) {
  
  /**
   * Creates a time axis control.
   * 
   * @param {object} covLayer 
   *   The coverage data layer, or any object with <code>timeSlices</code>
   *   and <code>time</code> properties.
   *   If the object has <code>on</code>/<code>off</code> methods, then the control will
   *   listen for <code>"axisChange"</code> events with <code>{axis: 'time'}</code>
   *   and update itself automatically.
   *   If the layer fires a <code>"remove"</code> event, then the control will remove itself
   *   from the map.
   * @param {object} [options] Control options.
   * @param {string} [options.position='topleft'] The initial position of the control (see Leaflet docs).
   * @param {string} [options.title='Time'] The label to show above the date/time picker.
   */
  constructor (covLayer, options = {}) {
    super({position: options.position || 'topleft'})
    this._title = options.title || 'Time'
    this._covLayer = covLayer

    if (covLayer.on) {
      this._remove = () => this.removeFrom(this._map)
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
    
    let el = HTML(TEMPLATE)
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
   * <code>time</code> property of the layer.
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

