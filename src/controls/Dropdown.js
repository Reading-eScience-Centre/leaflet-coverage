import L from 'leaflet'

import {$$, fromTemplate, HTML} from './utils.js'
import {EventMixin} from '../util/EventMixin.js'

const DEFAULT_TEMPLATE_ID = 'template-coverage-dropdown'
const DEFAULT_TEMPLATE = `<template id="${DEFAULT_TEMPLATE_ID}">
<div class="leaflet-coverage-control" style="clear:none">
  <strong class="select-title"></strong><br>
  <select class="form-control"></select>
</div>
</template>`

/**
 * The `change` event, signalling that a different dropdown element has been selected.
 * 
 * @typedef {L.Event} Dropdown#change
 * @property {string} value The value of the selected item.
 */

/**
 * An event-enabled dropdown control with optional title.
 * 
 * Used in {@link VerticalAxis}.
 * 
 * @extends {L.Control}
 * @extends {EventMixin}
 * 
 * @emits {Dropdown#change} when a different dropdown element has been selected
 */
export class Dropdown extends EventMixin(L.Control) {
  /**
   * @param {Array<Object>} choices The dropdown items given as an array of `{value, label}` objects.
   * @param {Object} [options] The options object.
   * @param {string} [options.position='topleft'] The position of the control (one of the map corners).
   *    Possible values are 'topleft', 'topright', 'bottomleft' or 'bottomright'.
   * @param {string} [options.title] The dropdown title that is displayed above the dropdown.
   * @param {string} [options.value] Value of the item that should be initially selected.
   * @param {string} [options.templateId] Element ID of an alternative HTML `<template>` element to use.
   */
  constructor (choices, options={}) {
    super(options.position ? {position: options.position} : {position: 'topleft'})
    this._templateId = options.templateId || DEFAULT_TEMPLATE_ID
    this._title = options.title || ''
    this._choices = choices
    this._value = options.value || choices[0].value

    if (!options.templateId && document.getElementById(DEFAULT_TEMPLATE_ID) === null) {
      inject(DEFAULT_TEMPLATE)
    } 
  }
  
  /**
   * @override
   * @ignore
   */
  onAdd (map) {
    let el = fromTemplate(this._templateId)
    this._el = el
    
    L.DomEvent.disableClickPropagation(el)
    
    $$('.select-title', el).innerHTML = this._title
    
    for (let {value, label} of this._choices) {
      $$('select', el).appendChild(HTML(`<option value="${value}">${label}</option>`))
    }
    $$('select', el).disabled = this._choices.length <= 1
    this.value = this._value
    
    $$('select', el).addEventListener('change', event => {
      this._value = event.target.value
      this.fire('change', {value: event.target.value})
    })
    
    return el
  }
  
  /** 
   * Returns the value of the currently selected item.
   * 
   * @type {string}
   * 
   * @example
   * let current = dropdown.value
   */
  get value () {
    return this._value
  }
  
  /** 
   * Selects the item with the given value.
   * 
   * @type {string}
   * 
   * @example
   * dropdown.value = 'foobar'
   */
  set value (val) {
    $$('select', this._el).value = val
  }
    
}
