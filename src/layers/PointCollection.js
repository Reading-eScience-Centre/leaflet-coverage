import L from 'leaflet'

import {PaletteMixin} from './PaletteMixin.js'
import {EventMixin} from '../util/EventMixin.js'
import {Point, DEFAULT_COLOR} from './Point.js'
import {enlargeExtentIfEqual} from './palettes.js'
import {kdTree} from '../util/kdTree.js'

/**
 * A collection of points sharing the same parameters and coordinate referencing system.
 * 
 * @see https://covjson.org/domain-types/#point
 * 
 * @emits {DataLayer#afterAdd} Layer is initialized and was added to the map
 * @emits {DataLayer#error} Error when loading data
 * @emits {PaletteMixin#paletteChange} Palette has changed
 * @emits {PaletteMixin#paletteExtentChange} Palette extent has changed
 * @emits {Point#click} when the point was clicked
 * 
 * @extends {L.Layer}
 * @extends {PaletteMixin} 
 */
export class PointCollection extends PaletteMixin(L.Layer) {
  /**
   * @param {CoverageCollection} covcoll The coverage collection to visualize.
   * @param {Object} [options] The options object.
   * @param {string} [options.parameter] The key of the parameter to display.
   * @param {Palette} [options.palette] The initial color palette to use, the default depends on the parameter type.
   * @param {string} [options.paletteExtent='full'] The initial palette extent, either 'full', 'fov', or specific: [-10,10].
   * @param {string} [options.defaultColor='black'] The color to use for missing data or if no parameter is set.
   * @param {class} [options.pointClass=Point] The {@link PointDataLayer} class to use for the individual points.
   * @param {function} [options.pointOptionsFn] A function that returns additional options to apply for each point class instance.  
   */
  constructor (covcoll, options={}) {
    super()
    
    // TODO how should we handle collection paging?
    
    if (!options.paletteExtent) {
      options.paletteExtent = 'full'
    }
    
    L.Util.setOptions(this, options)

    this._covcoll = covcoll
    let paramKey = options.keys ? options.keys[0] : options.parameter
    this._param = paramKey ? covcoll.parameters.get(paramKey) : null
    this._defaultColor = options.defaultColor || DEFAULT_COLOR
    this._pointClass = options.pointClass || Point
        
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
  
  /**
   * @ignore
   * @override
   */
  onAdd (map) {
    this._map = map
    this._layerLoadCount = 0
    this._layerErrors = []
    
    let options = {
      keys: this._param ? [this._param.key] : undefined,
      defaultColor: this._defaultColor,
      palette: this.palette,
      paletteExtent: this.paletteExtent
    }
    if (this.options.pointOptionsFn) {
      let opts = this.options.pointOptionsFn()
      for (let key in opts) {
        options[key] = opts[key]
      }
    }
    for (let cov of this._covcoll.coverages) {
      let layer = new this._pointClass(cov, options)
      this._attachListeners(layer, cov)
      this._layerGroup.addLayer(layer)
      this._layers.push(layer)
      layer.load()
      if (this._popupFn) {
        let popup = this._popupFn(layer.coverage)
        layer.bindPopup(popup)
      }
    }
    
  }
  
  /**
   * @ignore
   * @override
   */
  onRemove (map) {
    map.removeLayer(this._layerGroup)
    this._layerGroup = L.layerGroup()
    this._layers = []
  }
  
  /**
   * Binds a popup to each point instance.
   * 
   * @param {function(cov: Coverage):String|HTMLElement|L.Popup} fn Returns the popup for a given point coverage. 
   */
  bindPopupEach (fn) {
    this._popupFn = fn
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
        this.initializePalette().then(() => {
          this._layerGroup.addTo(this._map)
          this.fire('afterAdd')
        })
      }
    }
  }
  
  _initKdtree () {
    let points = this._layers.map(layer => {
      let point = layer.getLatLng()
      point.layer = layer
      return point
    })
    let distance = (point1, point2) => L.LatLng.prototype.distanceTo.call(point1, point2)
    let dimensions = ['lat', 'lng']
    this._kdtree = new kdTree(points, distance, dimensions)
  }
  
  /**
   * Returns the geographic bounds of the coverage collection.
   * 
   * @return {L.LatLngBounds}
   */
  getBounds () {
    return L.latLngBounds(this._layers.map(layer => layer.getLatLng()))
  }
  
  /**
   * Return the displayed value of the point coverage closest to
   * the given position and within the given maximum distance.
   * If no coverage is found, undefined is returned, otherwise
   * a number or null (no-data).
   * 
   * @param {L.LatLng} latlng reference position
   * @param {number} maxDistance
   *   Maximum distance in meters that the point coverage may be
   *   apart from the given position.
   * @return {number|null|undefined}
   */
  getValueAt (latlng, maxDistance) {
    let points = this._kdtree.nearest(latlng, 1, maxDistance)
    if (points.length > 0) {
      let point = points[0][0]
      let val = point.layer.getValue()
      return val
    }
  }
  
  /**
   * The parameter that is visualized.
   * 
   * @type {Parameter}
   */
  get parameter () {
    return this._param
  }
    
  /**
   * See {@link PaletteMixin}.
   * 
   * @ignore
   */
  computePaletteExtent (extent) {
    if (!this._param) {
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
  
  /**
   * Redraw each point layer.
   */
  redraw () {
    for (let layer of this._layers) {
      layer.redraw()
    }
  }
}
