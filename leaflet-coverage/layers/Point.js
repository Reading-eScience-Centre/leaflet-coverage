import L from 'leaflet'
import {linearPalette, scale} from './palettes.js'
import * as referencingutil from '../util/referencing.js'
import CircleMarkerMixin from './CircleMarkerMixin.js'
import EventMixin from '../util/EventMixin.js'

/** @ignore */
export const DEFAULT_COLOR = 'black'
/** @ignore */
export const DEFAULT_PALETTE = linearPalette(['#deebf7', '#3182bd']) // blues
  
/**
 * Renderer for Coverages with domain type Point.
 * 
 * This will simply display a dot on the map and fire a click
 * event when a user clicks on it.
 * The dot either has a defined standard color, or it uses
 * a palette if a parameter is chosen.
 */
export default class Point extends CircleMarkerMixin(EventMixin(L.Class)) {
  
  constructor (cov, options) {
    super()

    this.cov = cov
    this.param = options.keys ? cov.parameters.get(options.keys[0]) : null
    this.defaultColor = options.color || DEFAULT_COLOR
    this.showNoData = options.showNoData // if true, draw with default color
        
    if (this.param && this.param.categories) {
      throw new Error('category parameters are currently not supported for Point')
    }
    
    this._palette = options.palette || DEFAULT_PALETTE
    if (Array.isArray(options.paletteExtent)) {
      this._paletteExtent = options.paletteExtent
    } else {
      this._paletteExtent = 'full'
    }
  }
  
  onAdd (map) {
    this._map = map

    this.load().then(() => {
      this._addMarker()
      this.fire('add')
    })
  }
  
  /**
   * Load all data without adding anything to the map.
   * After loading is done, all functions and properties can be accessed (like getLatLng()).
   */
  load () {    
    this.fire('dataLoading') // for supporting loading spinners
    
    function checkWGS84 (domain) {
      let srs = referencingutil.getRefSystem(domain, ['x', 'y'])
      if (!referencingutil.isGeodeticWGS84CRS(srs)) {
        throw new Error('Unsupported CRS, must be WGS84')
      }
    }
    
    let promise    
    if (this.param) {
      promise = Promise.all([this.cov.loadDomain(), this.cov.loadRange(this.param.key)])
        .then(([domain, range]) => {
          this.domain = domain
          checkWGS84(domain)
          this.range = range
          this._updatePaletteExtent(this._paletteExtent)
          this.fire('dataLoad')
        })
    } else {
      promise = this.cov.loadDomain().then(domain => {
        this.domain = domain
        checkWGS84(domain)
        this.fire('dataLoad')
      })
    }
    
    promise.catch(e => {
      console.error(e)
      this.fire('error', e)
      this.fire('dataLoad')
    })
    return promise
  }
  
  onRemove () {
    this.fire('remove')
    this._removeMarker()
  }
  
  getBounds () {
    return L.latLngBounds([this.getLatLng()])
  }
  
  getLatLng () {
    // TODO convert coordinates to lat/lon if necessary
    let x = this.domain.axes.get('x').values[0]
    let y = this.domain.axes.get('y').values[0]
    return L.latLng(y, x)
  }
  
  get coverage () {
    return this.cov
  }
    
  get parameter () {
    return this.param
  }
  
  set palette (p) {
    this._palette = p
    this.redraw()
    this.fire('paletteChange')
  }
  
  get palette () {
    return this.param ? this._palette : undefined
  }
  
  set paletteExtent (extent) {
    this._updatePaletteExtent(extent)
    this.redraw()
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

    let val = this.getValue()
    this._paletteExtent = [val, val]
  }
  
  /**
   * Return the displayed value (number, or null for no-data),
   * or undefined if not fixed to a z-coordinate or parameter.
   */
  getValue () {
    if (this.param) {
      return this.range.get({})
    }    
  }
  
  _getColor (val) {
    if (val === null) {
      // no-data
      return this.defaultColor
    } else if (val === undefined) {
      // not fixed to a param
      return this.defaultColor
    } else {
      // use a palette
      let valScaled = scale(val, this.palette, this.paletteExtent)
      let {red, green, blue} = this.palette
      return {r: red[valScaled], g: green[valScaled], b: blue[valScaled]}
    }
  }
}
