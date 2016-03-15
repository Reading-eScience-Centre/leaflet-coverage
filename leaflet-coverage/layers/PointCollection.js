import L from 'leaflet'

import {default as Point, DEFAULT_COLOR, DEFAULT_PALETTE} from './Point.js'
import kdTree from '../util/kdTree.js'

/**
 * A collection of points sharing the same parameters / referencing.
 * 
 */
class PointCollection extends L.Class {
  constructor (covcoll, options) {
    super()
    
    // TODO how should we handle collection paging?

    this.covcoll = covcoll
    this.param = options.keys ? covcoll.parameters.get(options.keys[0]) : null
    this.defaultColor = options.color || DEFAULT_COLOR
    this.pointClass = options.pointClass || Point
    this.pointOptionsFn = options.pointOptionsFn
    
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
      palette: this._palette,
      paletteExtent: this._paletteExtent
    }
    if (this.pointOptionsFn) {
      let opts = this.pointOptionsFn()
      for (let key in opts) {
        options[key] = opts[key]
      }
    }
    for (let cov of this.covcoll) {
      let layer = new this.pointClass(cov, options)
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
   * Return the displayed value of the point coverage closest to
   * the given position and within the given maximum distance.
   * If no coverage is found, undefined is returned, otherwise
   * a number or null (no-data).
   * 
   * @param {number} maxDistance
   *   Maximum distance in meters that the point coverage may be
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
  
  get palette () {
    return this.param ? this._palette : undefined
  }
  
  set palette (val) {
    this._palette = val
    for (let layer of this._layers) {
      layer.palette = val
    }
    this.fire('paletteChange')
  }
  
  set paletteExtent (extent) {
    this._updatePaletteExtent(extent)
    for (let layer of this._layers) {
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
  
  redraw () {
    for (let layer of this._layers) {
      layer.redraw()
    }
  }
}

PointCollection.include(L.Mixin.Events)

//work-around for Babel bug, otherwise PointCollection cannot be referenced here
export { PointCollection as default }
