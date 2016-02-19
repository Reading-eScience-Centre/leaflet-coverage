import L from 'leaflet'

/**
 * A mixin that encapsulates the creation, update, and removal
 * of a CircleMarker.
 * 
 * See Point and VerticalProfile for usage.
 * 
 * @param {class} base The base class.
 * @return {class} The base class with CircleMarkerMixin.
 */
export default function CircleMarkerMixin (base) {
  return class extends base {
  
    /*
     * The base class must supply the following:
     * 
     * getValue()
     * _getColor(val)
     * getLatLng()
     */
  
    _addMarker () {
      // TODO do coordinate transformation to lat/lon if necessary
      
      let val = this.getValue()
      if (val === null && !this.showNoData) {
        return
      }
      let color = this._getColor(val)    
      let latlng = this.getLatLng()
      
      this._marker = L.circleMarker(latlng, {color})
        .on('click', e => this.fire('click', e))
        .addTo(this._map)
      if (this._deferBindPopup) {
        this._marker.bindPopup(...this._deferBindPopup)
      }
    }
    
    _removeMarker () {
      if (this._marker) {
        this._map.removeLayer(this._marker)
        delete this._marker
      }
    }
    
    __updateMarker () {
      this._marker.options.color = this._getColor()
    }
    
    bindPopup (...args) {
      if (this._marker) {
        this._marker.bindPopup(...args)
      } else {
        this._deferBindPopup = args
      }
    }
    
    redraw () {
      if (this._marker) {
        this.__updateMarker()
        this._marker.redraw() 
      }
    }
  }
}
