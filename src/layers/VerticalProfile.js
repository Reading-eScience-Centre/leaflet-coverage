import L from 'leaflet'
import {isDomain, fromDomain, indexOfNearest, minMaxOfRange} from 'covutils'

import {enlargeExtentIfEqual} from './palettes.js'
import CoverageMixin from './CoverageMixin.js'
import CircleMarkerMixin from './CircleMarkerMixin.js'
import PaletteMixin from './PaletteMixin.js'
import EventMixin from '../util/EventMixin.js'

import {DEFAULT_COLOR} from './Point.js'

/**
 * Renderer for Coverages with domain type Profile.
 * 
 * This will simply display a dot on the map and fire a click
 * event when a user clicks on it.
 * The dot either has a defined standard color, or it uses
 * a palette together with a target depth if a parameter is chosen.
 */
export default class VerticalProfile extends PaletteMixin(CircleMarkerMixin(CoverageMixin(EventMixin(L.Class)))) {
  
  constructor (cov, options) {
    super()
    
    if (isDomain(cov)) {
      cov = fromDomain(cov)
      delete options.keys
    }
    
    if (!options.paletteExtent) {
      options.paletteExtent = 'full'
    }
    
    L.Util.setOptions(this, options)

    this.cov = cov
    this.param = options.keys ? cov.parameters.get(options.keys[0]) : null
    this._axesSubset = {
      z: {coordPref: options.vertical}
    }
    this.defaultColor = options.color ? options.color : DEFAULT_COLOR
    this.showNoData = options.showNoData // if true, draw with default color
  }
  
  onAdd (map) {
    this._map = map

    this.load()
      .then(() => this.initializePalette())
      .then(() => {
        this._addMarker()
        this.fire('add')
      })
  }
    
  _loadCoverageSubset () {
    // adapted from Grid.js
    let z = this._axesSubset.z
    if (z.coordPref == undefined) {
      z.idx = z.coord = undefined
    } else {
      let vals = this.domain.axes.get('z').values
      z.idx = indexOfNearest(vals, z.coordPref)
      z.coord = vals[z.idx]
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
    let x = this.domain.axes.get('x').values[0]
    let y = this.domain.axes.get('y').values[0]
    let latlng = this.projection.unproject({x,y})
    return L.latLng(latlng)
  }
  
  get coverage () {
    return this.cov
  }
    
  get parameter () {
    return this.param
  }
  
  get vertical () {
    return this._axesSubset.z.coord
  }
  
  set vertical (val) {
    this._axesSubset.z.coordPref = val
    this._loadCoverageSubset()
    this.redraw()
    this.fire('axisChange', {axis: 'vertical'}) 
  }
  
  get verticalSlices () {
    let vals = this.domain.axes.get('z').values
    if (ArrayBuffer.isView(vals)) {
      // convert to plain Array to allow easier use
      vals = [...vals]
    }
    return vals
  }
    
  canUsePalette () {
    return this.vertical !== undefined
  }
    
  computePaletteExtent (extent) {
    if (extent === 'full') {
      if (!this.parameter) {
        throw new Error('palette extent cannot be set when no parameter has been chosen')
      }
      
      extent = minMaxOfRange(this.range)
      extent = enlargeExtentIfEqual(extent)
      return Promise.resolve(extent)
    } else {
      throw new Error('Unknown extent specification: ' + extent)
    }
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
  
  getValueAt (latlng, maxDistance) {
    let point = this.getLatLng()
    if (point.distanceTo(latlng) <= maxDistance) {
      return this.getValue()
    }
  }
  
  _getColor (val) {
    if (val === null) {
      // no-data
      return this.defaultColor
    } else if (val === undefined) {
      // not fixed to a param or z-coordinate
      return this.defaultColor
    } else {
      // use a palette
      let idx = this.getPaletteIndex(val)
      let {red, green, blue} = this.palette
      return {r: red[idx], g: green[idx], b: blue[idx]}
    }
  }
}
