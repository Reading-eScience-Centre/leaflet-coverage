import L from 'leaflet'
import {linearPalette, scale} from './palettes.js'
import * as utils from '../util/utils.js'
import * as opsnull from '../util/ndarray-ops-null.js'

const DOMAIN_TYPE = 'http://coveragejson.org/def#Profile'

const DEFAULT_COLOR = '#03f'
const DEFAULT_PALETTE = linearPalette(['#deebf7', '#3182bd']) // blues
  
/**
 * Renderer for Coverages with domain type Profile.
 * 
 * This will simply display a dot on the map and fire a click
 * event when a user clicks on it.
 * The dot either has a defined standard color, or it uses
 * a palette together with a target depth if a parameter is chosen.
 */
export default class Profile extends L.CircleMarker {
  
  constructor (cov, options) {
    super(L.latLng(0,0)) // we need to supply some initial value
    if (cov.domainType !== DOMAIN_TYPE) {
      throw new Error('Unsupported domain type: ' + cov.domainType + ', must be: ' + DOMAIN_TYPE)
    }
    this.cov = cov
    this.param = options.keys ? cov.parameters.get(options.keys[0]) : null
    this.targetZ = 'targetZ' in options ? options.targetZ : null
    this.defaultColor = options.color ? options.color : DEFAULT_COLOR
        
        
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
          this._updateMarker()
          super.onAdd(map)
          map.fire('dataload')
        })
    } else {
      promise = this.cov.loadDomain().then(domain => {
        console.log('domain loaded')
        this.domain = domain
        this._updateMarker()
        super.onAdd(map)
        map.fire('dataload')
      })
    }
          
    promise.catch(e => {
      console.error(e)
      this.fire('error', e)
      
      map.fire('dataload')
    })
  }
    
  get parameter () {
    return this.param
  }
  
  set palette (p) {
    this._palette = p
    this._doAutoRedraw()
    this.fire('paletteChange')
  }
  
  get palette () {
    return this._palette
  }
  
  set paletteExtent (extent) {
    this._updatePaletteExtent(extent)
    this._autoRedraw()
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
    let arr = utils.asSciJSndarray(this.range.values)
        
    // scan the whole range for min/max values
    this._paletteExtent = [arr.get(...opsnull.nullargmin(arr)), arr.get(...opsnull.nullargmax(arr))]
  }
  
  _updateMarker () {
    let {x,y,z} = this.domain
    
    // TODO do coordinate transformation to lat/lon if necessary
    this.setLatLng([y,x])
    
    if (!this.param || this.targetZ === null) {
      // use a default color since we don't use a palette here
      this.options.color = this.defaultColor
    } else {
      // use a palette
      // find the value with z nearest to targetZ
      let val = this.range.get(z[utils.indexOfNearest(z, this.targetZ)])
      if (val !== null) {
        let valScaled = scale(val, this.palette, this.paletteExtent)        
        let {red, green, blue} = this.palette
        this.options.color = `rgb(${red[valScaled]}, ${green[valScaled]}, ${blue[valScaled]})`
      }
    }
  }
  
  _doAutoRedraw () {
    if (this._autoRedraw) {
      this.redraw()
    }
  }
  
  redraw () {
    this._updateMarker()
    super.redraw()
  }
  
}
