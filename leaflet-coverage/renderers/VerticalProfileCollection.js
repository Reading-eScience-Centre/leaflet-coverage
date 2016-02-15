import L from 'leaflet'

import {default as VerticalProfile, DEFAULT_COLOR, DEFAULT_PALETTE} from './VerticalProfile.js'
import {COVJSON_VERTICALPROFILECOLLECTION, checkProfile} from '../util/constants.js'
import kdTree from '../util/kdTree.js'


// We implement this specifically for vertical profiles for now and see what we can move into
// a common class later.

/**
 * A collection of vertical profiles sharing the same parameters / referencing.
 * 
 */
class VerticalProfileCollection extends L.Class {
  constructor (covcoll, options) {
    super()
    checkProfile(covcoll.profiles, COVJSON_VERTICALPROFILECOLLECTION)
    
    // TODO how should we handle collection paging?

    this.covcoll = covcoll
    this.param = options.keys ? covcoll.parameters.get(options.keys[0]) : null
    this._vertical = options.vertical
    this.defaultColor = options.color ? options.color : DEFAULT_COLOR
            
    if (this.param && this.param.categories) {
      throw new Error('category parameters are currently not supported for VerticalProfileCollection')
    }
    
    this._palette = options.palette || DEFAULT_PALETTE

    if (!options.paletteExtent) {
      this._paletteExtent = 'full'
    } else if (Array.isArray(options.paletteExtent) || ['full', 'fov'].indexOf(options.paletteExtent) !== -1) {
      this._paletteExtent = options.paletteExtent
    } else {
      throw new Error('paletteExtent must either be a 2-element array, one of "full" or "fov", or be omitted')
    }
        
    // TODO remove code duplication
    switch (options.redraw) {
    case 'manual': this._autoRedraw = false; break
    case undefined:
    case 'onchange': this._autoRedraw = true; break
    default: throw new Error('redraw must be "onchange", "manual", or omitted (defaults to "onchange")')
    }
        
    this._layerGroup = L.layerGroup()
    this._layers = []
    this._kdtree = undefined
  }
  
  onAdd (map) {
    this._map = map
    this._layerAddCount = 0
    this._layerErrors = []
    
    let options = {
      keys: this.param ? [this.param.key] : undefined,
      color: this.defaultColor,
      vertical: this._vertical,
      palette: this._palette,
      paletteExtent: this._paletteExtent,
      redraw: this._autoRedraw ? 'onchange' : 'manual'
    }
    for (let cov of this.covcoll) {
      let layer = new VerticalProfile(cov, options)
      this._attachListeners(layer, cov)
      this._layerGroup.addLayer(layer)
      this._layers.push(layer)
    }
  }
  
  _attachListeners (layer, cov) {
    layer.once('add', () => {
      ++this._layerAddCount
      this._fireIfOnAddDone()
    }).once('error', e => {
      this._layerErrors.push(e)
      this._fireIfOnAddDone()
    }).on('click', e => {
      e.coverage = cov
      this.fire('click', e)
    })
  }
  
  _fireIfOnAddDone () {
    if (this._layerAddCount + this._layerErrors.length === this._layers.length) {
      if (this._layerErrors.length > 0) {
        this.fire('error', {errors: this._layerErrors})
      } else {
        this._initKdtree()
        if (this.param && this._vertical) {
          this._updatePaletteExtent()
        }
        this._layerGroup.addTo(this._map)        
        this.fire('add')
      }
    }
  }
  
  _initKdtree () {
    let points = this._layers.map(layer => {
      let point = layer.getLatLng()
      point.layer = layer
    })
    let distance = (point1, point2) => point1.distanceTo(point2)
    let dimensions = ['lat', 'lng']
    this._kdtree = new kdTree(points, distance, dimensions)
  }
  
  onRemove (map) {
    map.removeLayer(this._layerGroup)
    this.fire('remove')
  }
  
  getBounds () {
    return this._layerGroup.getBounds()
  }
  
  /**
   * Return the displayed value of the vertical profile closest to
   * the given position and within the given maximum distance.
   * If no profile is found, undefined is returned, otherwise
   * a number or null (no-data).
   * 
   * @param {number} maxDistance
   *   Maximum distance in meters that the vertical profile may be
   *   apart from the given position.
   */
  getValueAt (latlng, maxDistance) {
    let points = this._kdtree.nearest(latlng, 1, maxDistance)
    if (points.length > 0) {
      let point = points[0][0]
      let val = point.layer.getValue()
      return val
    }
  }
  
  get parameter () {
    return this.param
  }
    
  set vertical (val) {
    this._vertical = val
    for (let layer of this._layerGroup.getLayers()) {
      layer.vertical = val
    }
  }
  
  get palette () {
    return this.param && this._vertical !== undefined ? this._palette : undefined
  }
  
  set palette (val) {
    this._palette = val
    for (let layer of this._layerGroup.getLayers()) {
      layer.palette = val
    }
    this.fire('paletteChange')
  }
  
  set paletteExtent (extent) {
    this._updatePaletteExtent(extent)
    for (let layer of this._layerGroup.getLayers()) {
      layer.paletteExtent = this._paletteExtent
    }
    this.fire('paletteExtentChange')
  }
  
  get paletteExtent () {
    return this._paletteExtent
  }
  
  _updatePaletteExtent (extent) {
    if (Array.isArray(extent) && extent.length === 2) {
      this._paletteExtent = extent
      return
    }
    
    if (!this.param) {
      throw new Error('palette extent cannot be set when no parameter has been chosen')
    }
    
    let layers
    if (extent === 'full') {
      layers = this._layers
    } else if (extent === 'fov') {
      let bounds = this._map.getBounds()
      layers = this._layers.filter(layer => bounds.contains(layer.getLatLng()))
    } else {
      throw new Error('Unsupported: ' + extent)
    }
    
    let min = Infinity
    let max = -Infinity
    for (let layer of layers) {
      let val = layer.getValue()
      min = Math.min(min, val)
      max = Math.max(max, val)
    }
    this._paletteExtent = [min, max]
  }
}

VerticalProfileCollection.include(L.Mixin.Events)

//work-around for Babel bug, otherwise VerticalProfileCollection cannot be referenced here
export { VerticalProfileCollection as default }
