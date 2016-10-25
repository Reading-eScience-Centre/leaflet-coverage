import L from 'leaflet'

/**
 * A mixin that encapsulates the creation, update, and removal
 * of a CircleMarker.
 * 
 * See Point and VerticalProfile for usage.
 * 
 * @param {class} base The base class.
 * @return {class} The base class with CircleMarkerMixin.
 * 
 * @private
 */
export function CircleMarkerMixin (base) {
  return class extends base {
  
    /*
     * The base class must supply the following functions/properties:
     * 
     * getValue()
     * _getColor(val)
     * getLatLng()
     * coverage
     * showNoData (default: false)
     */
  
    _addMarker () {
      let val = this.getValue()
      if (val === null && !this.showNoData) {
        return
      }
      let {r,g,b} = this._getColor(val)    
      let latlng = this.getLatLng()
      
      let strokeBrightness = 0.7
      
      this._marker = L.circleMarker(latlng, {
        fillColor: 'rgb(' + r + ',' + g + ',' + b + ')',
        fillOpacity: 1,
        radius: 5,
        stroke: true,
        opacity: 1,
        weight: 1,
        color: 'rgb(' + Math.round(r*strokeBrightness) + ',' + 
                        Math.round(g*strokeBrightness) + ',' + 
                        Math.round(b*strokeBrightness) + ')'
      }).on('click', e => {
        e.coverage = this.coverage
        this.fire('click', e)
      }).addTo(this._map)
      
      if (this._popup) {
        this._marker.bindPopup(...this._popup)
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
      this._popup = args
      if (this._marker) {
        this._marker.bindPopup(...args)
      }
    }
    
    openPopup () {
      this._marker.openPopup()
      return this
    }
    
    closePopup () {
      this._marker.closePopup()
      return this
    }
    
    redraw () {
      if (this._marker) {
        this.__updateMarker()
        this._marker.redraw() 
      }
    }
  }
}
