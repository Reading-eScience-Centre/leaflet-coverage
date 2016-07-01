import L from 'leaflet'
import {enlargeExtentIfEqual} from './palettes.js'

import CoverageMixin from './CoverageMixin.js'
import CircleMarkerMixin from './CircleMarkerMixin.js'
import PaletteMixin from './PaletteMixin.js'
import EventMixin from '../util/EventMixin.js'

import {isDomain} from 'covutils/lib/validate.js'
import {fromDomain} from 'covutils/lib/coverage/create.js'

/** @ignore */
export const DEFAULT_COLOR = 'black'
  
/**
 * Renderer for Coverages and Domains with (domain) profile Point.
 * 
 * This will simply display a dot on the map and fire a click
 * event when a user clicks on it.
 * The dot either has a defined standard color, or it uses
 * a palette if a parameter is chosen.
 */
export default class Point extends PaletteMixin(CircleMarkerMixin(CoverageMixin(EventMixin(L.Class)))) {
  
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
    this.defaultColor = options.color || DEFAULT_COLOR
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
      
  computePaletteExtent (extent) {
    if (extent === 'full') {
      if (!this.parameter) {
        throw new Error('palette extent cannot be computed when no parameter has been chosen')
      }
  
      let val = this.getValue()
      extent = enlargeExtentIfEqual([val, val])
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
    if (this.param) {
      return this.range.get({})
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
      // not fixed to a param
      return this.defaultColor
    } else {
      // use a palette
      let idx = this.getPaletteIndex(val)
      let {red, green, blue} = this.palette
      return {r: red[idx], g: green[idx], b: blue[idx]}
    }
  }
}
