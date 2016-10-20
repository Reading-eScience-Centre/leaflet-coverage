import L from 'leaflet'

let Evented = L.Evented.prototype

/**
 * Wraps Leaflet's {@link L.Evented} for use within class expressions.
 * 
 * @see http://justinfagnani.com/2015/12/21/real-mixins-with-javascript-classes/
 * 
 * @param {class} base The base class.
 * @return {class} The base class with Leaflet's {@link L.Evented}.
 */
export default function EventMixin (base) {
  let clazz = class extends base {}
  for (let key in Evented) {
    clazz.prototype[key] = Evented[key]
  }
  return clazz
}
