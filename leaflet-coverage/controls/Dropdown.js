import L from 'leaflet'
import {$,HTML} from 'minified'

import EventMixin from '../util/EventMixin.js'

let TEMPLATE = 
`<div class="info" style="clear:none">
  <strong class="select-title"></strong><br>
  <select></select>
</div>`

export default class Dropdown extends EventMixin(L.Control) {
  constructor (choices, options) {
    super(options.position ? {position: options.position} : {position: 'topleft'})
    this._title = options.title || ''
    this._choices = choices
    this._value = options.value || choices[0].value
  }
  
  onAdd (map) {
    let el = HTML(TEMPLATE)[0]
    this._el = el
    
    L.DomEvent.disableClickPropagation(el)
    
    $('.select-title', el).fill(this._title)
    
    for (let {value, label} of this._choices) {
      $('select', el).add(HTML(`<option value="${value}">${label}</option>`))
    }
    $('select', el)[0].disabled = this._choices.length <= 1
    this.value = this._value
    
    $('select', el).on('change', event => {
      this._value = event.target.value
      this.fire('change', {value: event.target.value})
    })
    
    return el
  }
  
  get value () {
    return this._value
  }
  
  set value (val) {
    $('select', this._el)[0].value = val
  }
    
}
