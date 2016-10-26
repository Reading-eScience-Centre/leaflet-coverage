import L from 'leaflet'
import {cssToRGB} from './palettes.js'

/**
 * A mixin that encapsulates the creation, update, and removal
 * of a CircleMarker.
 * 
 * It provides the public methods `bindPopup`, `openPopup`, `closePopup`, and `redraw`.
 * 
 * See {@link Point} and {@link VerticalProfile} for usage.
 * 
 * @param {PointDataLayer} base The base class implementing the {@link PointDataLayer} interface.
 * @return {class} The base class with CircleMarkerMixin.
 */
export function CircleMarkerMixin (base) {
  return class extends base {
   
    _addMarker () {
      let val = this.getValue()
      if (val === null && !this.showNoData) {
        return
      }
      let color = this._getColor(val)
      let {r,g,b} = typeof color === 'string' ? cssToRGB(color) : color    
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
      let color = this._getColor(val)
      let {r,g,b} = typeof color === 'string' ? cssToRGB(color) : color
      this._marker.options.color = 'rgb(' + r + ',' + g + ',' + b + ')'
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
