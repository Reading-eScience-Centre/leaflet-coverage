import L from 'leaflet'

import {getLanguageString as i18n} from 'covutils/lib/i18n.js'
import {getCategory} from 'covutils/lib/parameter.js'

/**
 * A popup that contains the parameter values of the given coverage layers at the location of the popup.
 * 
 * The popup content is updated when one of the following occurs:
 * - popup is added to a map
 * - popup location is changed
 * - coverage layer is added or removed
 * - updateData() is called
 */
export default class ValuePopup extends L.Popup {
  /**
   * @param {number} [options.maxDistanceForPointsInPx=20]
   *   The maximum distance in pixels from the popup location for which point-data values should be included.
   * @param {Array<CoverageLayer>} [options.layers]
   *   An initial set of coverage layers.
   */
  constructor (options, source) {
    super(options, source)
    let layers = this.options.layers || []
    this._maxDistanceForPointsInPx = this.options.maxDistanceForPointsInPx || 20
    this.coverageLayers = new Set(layers.filter(layer => layer.getValueAt))
  }
  
  addCoverageLayer (layer) {
    if (!layer.getValueAt) return
    this.coverageLayers.add(layer)
    this.updateData()
    return this
  }
  
  removeCoverageLayer (layer) {
    this.coverageLayers.delete(layer)
    this.updateData()
    return this
  }
  
  onAdd (map) {
    this._map = map
    super.onAdd(map)
    this.updateData()
  }
  
  onRemove (map) {
    super.onRemove(map)
    this._map = null
  }
  
  setLatLng (latlng) {
    super.setLatLng(latlng)
    this.updateData()
    return this
  }
  
  /**
   * Returns whether there is any non-missing coverage data at the current popup location.
   * This function only works after the popup has been added to the map.
   */
  hasData () {
    return this._hasData
  }
    
  updateData () {
    if (!this._map) return
    let html = ''
      
    let latlng = this.getLatLng()
      
    for (let layer of this.coverageLayers) {      
      let maxDistance = getMetersPerPixel(this._map) * this._maxDistanceForPointsInPx
      let val = layer.getValueAt(latlng, maxDistance)
      if (val == null) continue
      let param = layer.parameter
      
      let unit = getUnitString(param)
      if (param.categoryEncoding) {
        let cat = getCategory(param, val)
        val = i18n(cat.label)
      }  
      html += '<div><strong>' + i18n(param.observedProperty.label) + '</strong>: ' + val + ' ' + unit + '</div>'
    }
    if (!html) {
      this._hasData = false
      html = 'No data.'
    }
    this._hasData = true
    this.setContent(html)
    return this
  }
}

// TODO move this to covutils
function getUnitString (param, language) {
  if (!param.unit) {
    return ''
  }
  if (param.unit.symbol) {
    let unit = param.unit.symbol.value || param.unit.symbol
    let scheme = param.unit.symbol.type
    if (scheme === 'http://www.opengis.net/def/uom/UCUM/') {
      if (unit === 'Cel') {
        unit = '°C'
      } else if (unit === '1') {
        unit = ''
      }
    }
    return unit
  } else {
    return i18n.getLanguageString(param.unit.label, language)
  }
}

function getMetersPerPixel (map) {
  // from L.Control.Scale
  let bounds = map.getBounds()
  let centerLat = bounds.getCenter().lat
  let halfWorldMeters = 6378137 * Math.PI * Math.cos(centerLat * Math.PI / 180)
  let dist = halfWorldMeters * (bounds.getNorthEast().lng - bounds.getSouthWest().lng) / 180
  let size = map.getSize()
  let perpx = dist / size.x
  return perpx
}
