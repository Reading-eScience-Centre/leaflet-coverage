import L from 'leaflet'
import {$,HTML} from 'minified'

let TEMPLATE = 
`<div class="info" style="clear:none">
  <strong class="title">Time</strong><br>
  <select name="date" class="date"></select>
  <select name="time" class="time"></select>
</div>`

export default class TimeAxis extends L.Control {
  constructor (covLayer, options) {
    options = options || {}
    super(options.position ? {position: options.position} : {position: 'topleft'})
    this._title = options.title
    this.covLayer = covLayer

    this._remove = () => this.removeFrom(this._map)
    covLayer.on('remove', this._remove)
    
    this._axisListener = e => {
      if (e.axis === 'time') this.updateAxis(covLayer.time)
    }
    
    let timeSlices = this.covLayer.timeSlices
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
    
  onRemove (map) {
    this.covLayer.off('remove', this._remove)
    this.covLayer.off('axisChange', this._axisListener)
  }
  
  onAdd (map) {
    this.covLayer.on('axisChange', this._axisListener)
    
    let el = HTML(TEMPLATE)[0]
    this._el = el
    L.DomEvent.disableClickPropagation(el)
    
    if (this._title) {
      $('.title', el).fill(this._title)
    }
    
    for (let dateTimestamp of this._dateMap.keys()) {
      let dateStr = getUTCDateString(dateTimestamp)
      $('.date', el).add(HTML(`<option value="${dateStr}">${dateStr}</option>`))
    }
    
    $('.date', el).on('change', event => {
      let dateTimestamp = getUTCTimestampDateOnly(event.target.value)
      let timeSlice = this._dateMap.get(dateTimestamp)[0]
      this.covLayer.time = timeSlice
      this.initTimeSelect(dateTimestamp)
    })
    $('.time', el).on('change', event => {
      let dateStr = $('.date', el)[0].value
      let timeStr = event.target.value
      let time = new Date(dateStr + 'T' + timeStr)
      this.covLayer.time = time
    })
    
    this.updateAxis(this.covLayer.time)
    
    return el
  }
  
  updateAxis (covTime) {
    let el = this._el
    // selects the date set in the cov layer, populates the time select, and selects the time
    let dateTimestamp = getUTCTimestampDateOnly(covTime.toISOString())
    let dateStr = getUTCDateString(dateTimestamp)
    $('.date', el)[0].value = dateStr 
    
    this.initTimeSelect(dateTimestamp)
    
    let timeStr = covTime.toISOString().substr(11)
    $('.time', el)[0].value = timeStr
  }
  
  initTimeSelect (dateTimestamp) {
    let el = this._el
    let timeSelect = $('.time', el)
    timeSelect.fill()
    let times = this._dateMap.get(dateTimestamp)
    for (let timeSlice of times) {
      let timeStr = timeSlice.toISOString().substr(11)
      timeSelect.add(HTML(`<option value="${timeStr}">${timeStr}</option>`))
    }
    timeSelect[0].disabled = times.length === 1
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

TimeAxis.include(L.Mixin.Events)

//work-around for Babel bug, otherwise SelectControl cannot be referenced here
export { TimeAxis as default }
