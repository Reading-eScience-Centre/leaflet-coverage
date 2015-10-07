import L from 'leaflet'
import {linearPalette, scale} from './palettes.js'
import * as arrays from '../util/arrays.js'
import * as opsnull from '../util/ndarray-ops-null.js'

const DOMAIN_TYPE = 'http://coveragejson.org/def#Profile'

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
export class Profile extends L.Class {
  
  constructor (cov, options) {
    super()
    if (cov.domainType !== DOMAIN_TYPE) {
      throw new Error('Unsupported domain type: ' + cov.domainType + ', must be: ' + DOMAIN_TYPE)
    }
    this.cov = cov
    this.param = options.keys ? cov.parameters.get(options.keys[0]) : null
    this._targetZ = 'targetZ' in options ? options.targetZ : null
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
    
    map.fire('dataloading') // for supporting loading spinners
    
    let promise    
    if (this.param) {
      promise = Promise.all([this.cov.loadDomain(), this.cov.loadRange(this.param.key)])
        .then(([domain, range]) => {
          console.log('domain and range loaded')
          this.domain = domain
          this.range = range
          this._updatePaletteExtent(this._paletteExtent)
          this._addMarker()
          this.fire('add')
          map.fire('dataload')
        })
    } else {
      promise = this.cov.loadDomain().then(domain => {
        console.log('domain loaded')
        this.domain = domain
        this._addMarker()
        this.fire('add')
        map.fire('dataload')
      })
    }
          
    promise.catch(e => {
      console.error(e)
      this.fire('error', e)
      
      map.fire('dataload')
    })
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
  
  get targetZ () {
    return this._targetZ
  }
  
  set targetZ (z) {
    this._targetZ = z
    this._doAutoRedraw()
    this.fire('targetZChange')
  }
  
  set palette (p) {
    this._palette = p
    this._doAutoRedraw()
    this.fire('paletteChange')
  }
  
  get palette () {
    return this.param && this.targetZ !== null ? this._palette : null
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
      throw new Error('palette extent cannot be set when no trajectory parameter has been chosen')
    }

    // wrapping as SciJS's ndarray allows us to do easy subsetting and efficient min/max search
    let arr = arrays.asSciJSndarray(this.range.values)
        
    // scan the whole range for min/max values
    this._paletteExtent = [arr.get(...opsnull.nullargmin(arr)), arr.get(...opsnull.nullargmax(arr))]
  }
  
  _addMarker () {
    let {x,y} = this.domain
    this.marker = L.circleMarker(L.latLng(y, x), {color: this._getColor()})
    
    this.marker.on('click', e => {
      this.fire('click')
    })
    
    this.marker.addTo(this._map)
  }
  
  _removeMarker () {
    this._map.removeLayer(this.marker)
    delete this.marker
  }
  
  _getColor () {
    let {x,y,z} = this.domain
    
    // TODO do coordinate transformation to lat/lon if necessary
    
    if (this.param && this.targetZ !== null) {
      // use a palette
      // find the value with z nearest to targetZ
      let val = this.range.get(z[arrays.indexOfNearest(z, this.targetZ)])
      if (val !== null) {
        let valScaled = scale(val, this.palette, this.paletteExtent)        
        let {red, green, blue} = this.palette
        return `rgb(${red[valScaled]}, ${green[valScaled]}, ${blue[valScaled]})`
      }
    }
    return this.defaultColor
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

Profile.include(L.Mixin.Events)

// work-around for Babel bug, otherwise Profile cannot be referenced here
export { Profile as default }
