import L from 'leaflet'

import PaletteMixin from './PaletteMixin.js'
import EventMixin from '../util/EventMixin.js'
import {default as Point, DEFAULT_COLOR} from './Point.js'
import {enlargeExtentIfEqual} from './palettes.js'
import {kdTree} from '../util/kdTree.js'

/**
 * A collection of points sharing the same parameters / referencing.
 * 
 */
export default class PointCollection extends PaletteMixin(EventMixin(L.Class)) {
  constructor (covcoll, options) {
    super()
    
    // TODO how should we handle collection paging?
    
    if (!options.paletteExtent) {
      options.paletteExtent = 'full'
    }
    
    L.Util.setOptions(this, options)

    this.covcoll = covcoll
    this.param = options.keys ? covcoll.parameters.get(options.keys[0]) : null
    this.defaultColor = options.color || DEFAULT_COLOR
    this.pointClass = options.pointClass || Point
    this.pointOptionsFn = options.pointOptionsFn
        
    this._layerGroup = L.layerGroup()
    this._layers = []
    this._kdtree = undefined
    
    this.on('paletteChange', () => {
      for (let layer of this._layers) {
        layer.palette = this.palette
      }
    })
    this.on('paletteExtentChange', () => {
      for (let layer of this._layers) {
        layer.paletteExtent = this.paletteExtent
      }
    })
  }
  
  onAdd (map) {
    this._map = map
    this._layerLoadCount = 0
    this._layerErrors = []
    
    let options = {
      keys: this.param ? [this.param.key] : undefined,
      color: this.defaultColor,
      palette: this.palette,
      paletteExtent: this.paletteExtent
    }
    if (this.pointOptionsFn) {
      let opts = this.pointOptionsFn()
      for (let key in opts) {
        options[key] = opts[key]
      }
    }
    for (let cov of this.covcoll.coverages) {
      let layer = new this.pointClass(cov, options)
      layer.load()
      this._attachListeners(layer, cov)
      this._layerGroup.addLayer(layer)
      this._layers.push(layer)
    }
    
  }
  
  onRemove (map) {
    this._map.removeLayer(this._layerGroup)
    this._layerGroup = L.layerGroup()
  }
  
  _attachListeners (layer, cov) {
    layer.once('dataLoad', () => {
      ++this._layerLoadCount
      this._fireIfOnAddDone()
    }).once('error', e => {
      this._layerErrors.push(e)
    }).on('click', e => {
      e.coverage = cov
      this.fire('click', e)
    })
  }
  
  _fireIfOnAddDone () {
    if (this._layerLoadCount === this._layers.length) {
      if (this._layerErrors.length > 0) {
        this.fire('error', {errors: this._layerErrors})
      } else {
        this._initKdtree()
        if (this.param) {
          this.initializePalette()
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
      return point
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
    
  computePaletteExtent (extent) {
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
      if (val != null) {
        min = Math.min(min, val)
        max = Math.max(max, val)
      }
    }
    extent = enlargeExtentIfEqual([min, max])
    return Promise.resolve(extent)
  }
  
  redraw () {
    for (let layer of this._layers) {
      layer.redraw()
    }
  }
}
