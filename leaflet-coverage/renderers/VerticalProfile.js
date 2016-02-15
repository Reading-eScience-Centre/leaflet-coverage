import L from 'leaflet'
import {linearPalette, scale} from './palettes.js'
import * as arrays from '../util/arrays.js'
import * as rangeutil from '../util/range.js'
import * as referencingutil from '../util/referencing.js'
import {COVJSON_VERTICALPROFILE, checkProfile} from '../util/constants.js'

const DEFAULT_COLOR = 'black'
const DEFAULT_PALETTE = linearPalette(['#deebf7', '#3182bd']) // blues
  
/**
 * Renderer for Coverages with domain type Profile.
 * 
 * This will simply display a dot on the map and fire a click
 * event when a user clicks on it.
 * The dot either has a defined standard color, or it uses
 * a palette together with a target depth if a parameter is chosen.
 */
class VerticalProfile extends L.Class {
  
  constructor (cov, options) {
    super()
    checkProfile(cov.domainProfiles, COVJSON_VERTICALPROFILE)

    this.cov = cov
    this.param = options.keys ? cov.parameters.get(options.keys[0]) : null
    this._axesSubset = {
      z: {coordPref: options.vertical}
    }
    this.defaultColor = options.color ? options.color : DEFAULT_COLOR
        
    if (this.param && this.param.categories) {
      throw new Error('category parameters are currently not support for Profile')
    }
    
    this._palette = options.palette || DEFAULT_PALETTE
    if (Array.isArray(options.paletteExtent)) {
      this._paletteExtent = options.paletteExtent
    } else {
      this._paletteExtent = 'full'
    }
        
    // TODO remove code duplication
    switch (options.redraw) {
    case 'manual': this._autoRedraw = false; break
    case undefined:
    case 'onchange': this._autoRedraw = true; break
    default: throw new Error('redraw must be "onchange", "manual", or omitted (defaults to "onchange")')
    }
  }
  
  onAdd (map) {
    this._map = map
    
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
          console.log('domain and range loaded')
          this.domain = domain
          checkWGS84(domain)
          this._subsetByCoordinatePreference()
          this.range = range
          this._updatePaletteExtent(this._paletteExtent)
          this._addMarker()
          this.fire('add')
          this.fire('dataLoad')
        })
    } else {
      promise = this.cov.loadDomain().then(domain => {
        console.log('domain loaded')
        this.domain = domain
        this._subsetByCoordinatePreference()
        checkWGS84(domain)
        this._addMarker()
        this.fire('add')
        this.fire('dataLoad')
      })
    }
          
    promise.catch(e => {
      console.error(e)
      this.fire('error', e)
      
      this.fire('dataLoad')
    })
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
  
  onRemove (map) {
    this.fire('remove')
    this._removeMarker()
  }
  
  getBounds () {
    return this.marker.getBounds()
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
    this._doAutoRedraw()
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
  
  set palette (p) {
    this._palette = p
    this._doAutoRedraw()
    this.fire('paletteChange')
  }
  
  get palette () {
    return this.param && this.vertical !== undefined ? this._palette : undefined
  }
  
  set paletteExtent (extent) {
    this._updatePaletteExtent(extent)
    this._doAutoRedraw()
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
      throw new Error('palette extent cannot be set when no profile parameter has been chosen')
    }

    this._paletteExtent = rangeutil.minMax(this.range)
  }
  
  _addMarker () {
    // TODO do coordinate transformation to lat/lon if necessary
    
    let x = this.domain.axes.get('x').values[0]
    let y = this.domain.axes.get('y').values[0]
    this.marker = L.circleMarker(L.latLng(y, x), {color: this._getColor()})
    
    this.marker.on('click', () => {
      this.fire('click')
    })
    
    this.marker.addTo(this._map)
  }
  
  _removeMarker () {
    this._map.removeLayer(this.marker)
    delete this.marker
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
    } else if (val === undefined) {
      // not fixed to a param or z-coordinate
      return this.defaultColor
    } else {
      // use a palette
      let valScaled = scale(val, this.palette, this.paletteExtent)        
      let {red, green, blue} = this.palette
      return `rgb(${red[valScaled]}, ${green[valScaled]}, ${blue[valScaled]})`
    }
  }
  
  _updateMarker () {
    this.marker.options.color = this._getColor()
  }
  
  _doAutoRedraw () {
    if (this._autoRedraw) {
      this.redraw()
    }
  }
  
  redraw () {
    this._updateMarker()
    this.marker.redraw()
  }
  
}

VerticalProfile.include(L.Mixin.Events)

// work-around for Babel bug, otherwise Profile cannot be referenced here
export { VerticalProfile as default }
