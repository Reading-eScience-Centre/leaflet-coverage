import L from 'leaflet'
import {scale} from './palettes.js'
import * as palettes from './palettes.js'
import * as arrays from '../util/arrays.js'
import * as rangeutil from '../util/range.js'
import * as referencingutil from '../util/referencing.js'
import CircleMarkerMixin from './CircleMarkerMixin.js'
import EventMixin from '../util/EventMixin.js'

import {isDomain} from 'covutils/lib/validate.js'
import {toCoverage} from 'covutils/lib/transform.js'

import {DEFAULT_COLOR, DEFAULT_PALETTE} from './Point.js'

// TODO nearly identical to VerticalProfile

/**
 * Renderer for Coverages with domain type Profile.
 * 
 * This will simply display a dot on the map and fire a click
 * event when a user clicks on it.
 * The dot either has a defined standard color, or it uses
 * a palette together with a target depth if a parameter is chosen.
 */
export default class PointSeries extends CircleMarkerMixin(EventMixin(L.Class)) {
  
  constructor (cov, options) {
    super()
    
    if (isDomain(cov)) {
      cov = toCoverage(cov)
      delete options.keys
    }

    this.cov = cov
    this.param = options.keys ? cov.parameters.get(options.keys[0]) : null
    this._axesSubset = {
      t: {coordPref: options.time}
    }
    this.defaultColor = options.color ? options.color : DEFAULT_COLOR
    this.showNoData = options.showNoData // if true, draw with default color
        
    if (this.param && this.param.categories) {
      throw new Error('category parameters are currently not support for VerticalProfile')
    }
    
    if (options.palette) {
      this._palette = options.palette
    } else if (this.param && this.param.preferredPalette) {
      this._palette = palettes.create(this.param.preferredPalette)
    } else {
      this._palette = DEFAULT_PALETTE
    }
    
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
          checkWGS84(domain)
          this.domain = domain
          this._subsetByCoordinatePreference()
          this.range = range
          this._updatePaletteExtent(this._paletteExtent)
          this.fire('dataLoad')
        })
    } else {
      promise = this.cov.loadDomain().then(domain => {
        checkWGS84(domain)
        this.domain = domain
        this._subsetByCoordinatePreference()
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
  
  _subsetByCoordinatePreference () {
    // adapted from Grid.js
    let t = this._axesSubset.t
    if (t.coordPref == undefined) {
      t.idx = t.coord = undefined
    } else {
      let vals = this.domain.axes.get('t').values.map(v => v.getTime())
      t.idx = arrays.indexOfNearest(vals, t.coordPref.getTime())
      t.coord = vals[t.idx]
    }
    
    // Note that we don't subset the coverage currently, since there is no real need for it
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
  
  /**
   * Sets the currently active time to the one closest to the given Date object.
   * Throws an exception if there is no time axis.
   */
  set time (val) {
    let old = this.time
    this._axesSubset.t.coordPref = val.toISOString()
    
    this._subsetByCoordinatePreference().then(() => {
      if (old === this.time) return
      this._redraw()
      this.fire('axisChange', {axis: 'time'})
    })
  }
  
  /**
   * The currently active time on the temporal axis as Date object, 
   * or undefined if the grid has no time axis.
   */
  get time () {
    let time = this.domain.axes.get('t').values[this._axesSubset.t.idx]
    return new Date(time)
  }
  
  get timeSlices () {
    return this.domain.axes.get('t').values.map(t => new Date(t))
  }
  
  set palette (p) {
    this._palette = p
    this.redraw()
    this.fire('paletteChange')
  }
  
  get palette () {
    return this.param && this.vertical !== undefined ? this._palette : undefined
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

    this._paletteExtent = rangeutil.minMax(this.range)
  }
    
  /**
   * Return the displayed value (number, or null for no-data),
   * or undefined if not fixed to a z-coordinate or parameter.
   */
  getValue () {
    if (this.param && this._axesSubset.z.coord !== undefined) {
      let val = this.range.get({z: this._axesSubset.z.idx})
      return val
    }    
  }
  
  _getColor () {
    let val = this.getValue()
    if (val === null) {
      // no-data
      return this.defaultColor
    } else if (val === undefined) {
      // not fixed to a param or z-coordinate
      return this.defaultColor
    } else {
      // use a palette
      let valScaled = scale(val, this.palette, this.paletteExtent)        
      let {red, green, blue} = this.palette
      return {r: red[valScaled], g: green[valScaled], b: blue[valScaled]}
    }
  }
}
