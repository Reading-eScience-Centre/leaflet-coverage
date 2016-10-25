import L from 'leaflet'

import {getLanguageString as i18n, stringifyUnit, getCategory} from 'covutils'

/**
 * A popup that contains the parameter values of the given coverage layers at the location of the popup.
 * 
 * The popup content is updated when one of the following occurs:
 * - popup is added to a map
 * - popup location is changed
 * - coverage layer is added or removed
 * - updateData() is called
 * 
 * @extends {L.Popup}
 */
export class ValuePopup extends L.Popup {
  /**
   * @param {Object} [options] The options object.
   * @param {number} [options.maxDistanceForPointsInPx=20]
   *   The maximum distance in pixels from the popup location for which point-data values should be included.
   * @param {Array<DataLayer>} [options.layers] An initial set of coverage data layers.
   * @param {L.Layer} [source] Used to tag the popup with a reference to the Layer to which it refers.
   */
  constructor (options, source) {
    super(options, source)
    let layers = this.options.layers || []
    this._maxDistanceForPointsInPx = this.options.maxDistanceForPointsInPx || 20

    /**
     * The coverage data layers added to this popup.
     * 
     * @type {Set<DataLayer>}
     */
    this.coverageLayers = new Set(layers.filter(layer => layer.getValueAt))
  }
  
  /**
   * @param {DataLayer} layer The data layer to add.
   */
  addCoverageLayer (layer) {
    if (!layer.getValueAt) return
    this.coverageLayers.add(layer)
    this.updateData()
    return this
  }
  
  /**
   * @param {DataLayer} layer The data layer to remove.
   */
  removeCoverageLayer (layer) {
    this.coverageLayers.delete(layer)
    this.updateData()
    return this
  }
  
  /**
   * @ignore
   * @override
   */
  onAdd (map) {
    this._map = map
    super.onAdd(map)
    this.updateData()
  }
  
  /**
   * @ignore
   * @override
   */
  onRemove (map) {
    super.onRemove(map)
    this._map = null
  }
  
  /**
   * @ignore
   * @override
   */
  setLatLng (latlng) {
    super.setLatLng(latlng)
    this.updateData()
    return this
  }
  
  /**
   * Returns whether there is any non-missing coverage data at the current popup location.
   * This function only works after the popup has been added to the map.
   * 
   * @return {boolean}
   */
  hasData () {
    return this._hasData
  }
  
  /**
   * Updates the popup content from the data layers.
   * Gets called automatically when `setLatLng` is called.
   */
  updateData () {
    if (!this._map) return
    let html = ''
      
    let latlng = this.getLatLng()
      
    for (let layer of this.coverageLayers) {      
      let maxDistance = getMetersPerPixel(this._map) * this._maxDistanceForPointsInPx
      let val = layer.getValueAt(latlng, maxDistance)
      if (val == null) continue
      let param = layer.parameter
      
      let unit = !param.observedProperty.categories ? stringifyUnit(param.unit) : ''
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
