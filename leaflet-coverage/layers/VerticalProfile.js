import L from 'leaflet'
import {enlargeExtentIfEqual} from './palettes.js'
import * as arrays from '../util/arrays.js'
import * as rangeutil from '../util/range.js'
import * as referencingutil from '../util/referencing.js'
import CircleMarkerMixin from './CircleMarkerMixin.js'
import PaletteMixin from './PaletteMixin.js'
import EventMixin from '../util/EventMixin.js'

import {isDomain} from 'covutils/lib/validate.js'
import {toCoverage} from 'covutils/lib/transform.js'

import {DEFAULT_COLOR} from './Point.js'

/**
 * Renderer for Coverages with domain type Profile.
 * 
 * This will simply display a dot on the map and fire a click
 * event when a user clicks on it.
 * The dot either has a defined standard color, or it uses
 * a palette together with a target depth if a parameter is chosen.
 */
export default class VerticalProfile extends PaletteMixin(CircleMarkerMixin(EventMixin(L.Class))) {
  
  constructor (cov, options) {
    super()
    
    if (isDomain(cov)) {
      cov = toCoverage(cov)
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
          this.initializePalette()
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
    let z = this._axesSubset.z
    if (z.coordPref == undefined) {
      z.idx = z.coord = undefined
    } else {
      let vals = this.domain.axes.get('z').values
      z.idx = arrays.indexOfNearest(vals, z.coordPref)
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
  
  get vertical () {
    return this._axesSubset.z.coord
  }
  
  set vertical (val) {
    this._axesSubset.z.coordPref = val
    this._subsetByCoordinatePreference()
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
      
      extent = rangeutil.minMax(this.range)
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
      let idx = this.getPaletteIndex(val)
      let {red, green, blue} = this.palette
      return {r: red[idx], g: green[idx], b: blue[idx]}
    }
  }
}
