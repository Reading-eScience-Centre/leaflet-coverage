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
  return class extends base {
    on (...args) {
      return L.Mixin.Events.on.call(this, ...args)
    }
    off (...args) {
      return L.Mixin.Events.off.call(this, ...args)
    }
    once (...args) {
      return L.Mixin.Events.once.call(this, ...args)
    }
    fire (...args) {
      return L.Mixin.Events.fire.call(this, ...args)
    }
    hasEventListeners (...args) {
      return L.Mixin.Events.hasEventListeners.call(this, ...args)
    }
    // aliases
    addEventListener (...args) {
      return L.Mixin.Events.addEventListener.call(this, ...args)
    }
    removeEventListener (...args) {
      return L.Mixin.Events.removeEventListener.call(this, ...args)
    }
    addOneTimeEventListener (...args) {
      return L.Mixin.Events.addOneTimeEventListener.call(this, ...args)
    }
    fireEvent (...args) {
      return L.Mixin.Events.fireEvent.call(this, ...args)
    }
  }
}
