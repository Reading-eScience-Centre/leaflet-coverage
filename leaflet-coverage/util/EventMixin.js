import L from 'leaflet'

/**
 * Wraps Leaflet's L.Mixin.Events for use within class expressions.
 * 
 * @see http://justinfagnani.com/2015/12/21/real-mixins-with-javascript-classes/
 * 
 * @param {class} base The base class.
 * @return {class} The base class with EventMixin.
 */
export default function EventMixin (base) {
  let clazz = class extends base {}
  clazz.prototype = L.Mixin.Events
  return clazz
}
