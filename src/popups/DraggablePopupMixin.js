import L from 'leaflet'

/**
 * Makes L.Popup draggable and proxies all L.Draggable events.
 * 
 * @example
 * let DraggablePopup = DraggablePopupMixin(L.Popup)
 * let popup = new DraggablePopup().setContent('I am draggable!')
 * 
 * @private
 */
export default function DraggablePopupMixin (base) {
  return class extends base {
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
