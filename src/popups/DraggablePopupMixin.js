import L from 'leaflet'

/**
 * Makes {@link L.Popup} draggable and proxies all {@link L.Draggable} events.
 * 
 * @example
 * let DraggablePopup = DraggablePopupMixin(L.Popup)
 * let popup = new DraggablePopup().setContent('I am draggable!')
 * 
 * @param {class} base The base class.
 * @return {class} The base class with DraggablePopupMixin.
 */
export function DraggablePopupMixin (base) {
  return class extends base {
    constructor (options={}, source) {
      options.className = options.className || 'leaflet-popup-draggable'
      super(options, source)
    }
    
    onAdd (map) {
      super.onAdd(map)
      this._draggable = new L.Draggable(this._container, this._wrapper)
      this._draggable.enable()
      this._draggable.on('drag', e => {
        // Popup.setContent() resets to the pre-drag position and doesn't use L.DomUtil.setPosition
        // the code below works around that
        let pos = L.DomUtil.getPosition(this._wrapper.parentNode)
        let latlng = map.layerPointToLatLng(pos)
        this.setLatLng(latlng)
        this.fire('drag', e)
      })
      this._draggable.on('dragstart predrag dragend', e => this.fire(e.type, e))
    }
    
    onRemove (map) {
      this._draggable.disable()
      super.onRemove(map)
    }
  }
}
