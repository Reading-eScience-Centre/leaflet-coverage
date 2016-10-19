import L from 'leaflet'

let Events = L.Evented.prototype

/**
 * Wraps Leaflet's {@link L.Evented} for use within class expressions.
 * 
 * @see http://justinfagnani.com/2015/12/21/real-mixins-with-javascript-classes/
 * 
 * @param {class} base The base class.
 * @return {class} The base class with Leaflet's {@link L.Evented}.
 */
export default function EventMixin (base) {
  return class extends base {
    on (...args) {
      return Events.on.call(this, ...args)
    }
    off (...args) {
      return Events.off.call(this, ...args)
    }
    once (...args) {
      return Events.once.call(this, ...args)
    }
    fire (...args) {
      return Events.fire.call(this, ...args)
    }
    listens (...args) {
      return Events.listens.call(this, ...args)
    }
    // aliases
    addEventListener (...args) {
      return Events.addEventListener.call(this, ...args)
    }
    removeEventListener (...args) {
      return Events.removeEventListener.call(this, ...args)
    }
    addOneTimeEventListener (...args) {
      return Events.addOneTimeEventListener.call(this, ...args)
    }
    fireEvent (...args) {
      return Events.fireEvent.call(this, ...args)
    }
    hasEventListeners (...args) {
      return Events.hasEventListeners.call(this, ...args)
    }
    // internal
    _on (...args) {
      return Events._on.call(this, ...args)
    }
    _off (...args) {
      return Events._on.call(this, ...args)
    }
  }
}
