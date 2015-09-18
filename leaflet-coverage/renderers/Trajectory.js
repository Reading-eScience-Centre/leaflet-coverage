import L from 'leaflet'
import {linearPalette, scale} from './palettes.js'
import * as utils from '../util/utils.js'

const DOMAIN_TYPE = 'http://coveragejson.org/def#Trajectory'

const DEFAULT_PALETTE = linearPalette(['#deebf7', '#3182bd']) // blues
  
/**
 * Renderer for Coverages with domain type Trajectory.
 * 
 * Displays the trajectory as a path with coloured points using
 * a given palette for a given parameter.
 * 
 * Events fired onto the map:
 * "dataloading" - Data loading has started
 * "dataload" - Data loading has finished (also in case of errors)
 * 
 * Events fired on this layer:
 * TODO check if "loading" and "load" get called repeatedly on redraw()! if yes, add note, can be handled with .once()
 * "load" - Rendering has finished
 * "error" - Error when loading data
 * "paletteChange" - Palette has changed
 * "paletteExtentChange" - Palette extent has changed
 * "remove" - Layer is removed from the map
 * 
 */
class Trajectory extends L.LayerGroup {
  
  constructor (cov, options) {
    super()
    if (cov.domainType !== DOMAIN_TYPE) {
      throw new Error('Unsupported domain type: ' + cov.domainType + ', must be: ' + DOMAIN_TYPE)
    }
    this.cov = cov
    this.param = cov.parameters.get(options.keys[0])
    
    this._palette = options.palette || DEFAULT_PALETTE
    if (options.paletteExtent === undefined || options.paletteExtent === 'subset') {
      this._paletteExtent = 'full'
    } else if (Array.isArray(options.paletteExtent) || ['full', 'fov'].indexOf(options.paletteExtent) !== -1) {
      this._paletteExtent = options.paletteExtent
    } else {
      throw new Error('paletteExtent must either be a 2-element array, ' +
          'one of "full", "subset" (identical to "full" for trajectories) or "fov", or be omitted')
    }
    console.log('Trajectory layer created')
  }
  
  onAdd (map) {
    console.log('adding trajectory to map')
    this._map = map
    map.fire('dataloading') // for supporting loading spinners
    Promise.all([this.cov.loadDomain(), this.cov.loadRange(this.param.key)])
      .then(([domain, range]) => {
        console.log('domain and range loaded')
        this.domain = domain
        this.range = range
        this._updatePaletteExtent()
        this._addTrajectoryLayers()
        super.onAdd(map)
        this.fire('load')
        map.fire('dataload')
      })
      .catch(e => {
        console.error(e)
        this.fire('error', e)
        
        map.fire('dataload')
      })      
  }
  
  onRemove (map) {
    console.log('removing trajectory to map')
    super.onRemove(map)
  }
  
  get parameter () {
    return this.param
  }
  
  set palette (p) {
    this._palette = p
    this._autoRedraw()
    this.fire('paletteChange')
  }
  
  get palette () {
    return this._palette
  }
  
  _updatePaletteExtent () {
    let extent = this._paletteExtent
    if (Array.isArray(extent) && extent.length === 2) {
      this._paletteExtent = extent
      return
    } 

    // wrapping as SciJS's ndarray allows us to do easy subsetting and efficient min/max search
    let arr = utils.asSciJSndarray(this.range.values)
        
    if (extent === 'full') {
      // scan the whole range for min/max values, don't subset
      
    } else if (extent === 'fov') {
      // scan the values that are currently in field of view on the map for min/max
      // this implies using the current subset
      let bounds = this._map.getBounds()

      // TODO implement
      throw new Error('NOT IMPLEMENTED YET')      
    } else {
      throw new Error('Unknown extent specification: ' + extent)
    }

    this._paletteExtent = [arr.get(...opsnull.nullargmin(arr)), arr.get(...opsnull.nullargmax(arr))]
  }
  
  _addTrajectoryLayers () {
    // add a Polyline in black, and coloured CircleMarker's for each domain point
    let {x,y,z,t} = this.domain
    let vals = this.range.values
    
    // TODO do coordinate transformation to lat/lon if necessary
    
    let palette = this.palette
    let {red, green, blue} = this.palette
    let paletteExtent = this.paletteExtent
    
    let coords = []
    let markers = []
    for (let i=0; i < x.length; i++) {
      let val = vals[i]
      // this always has to be lat/lon, no matter which map projection is used
      let coord = new L.LatLng(y[i], x[i])
      coords.push(coord)
      if (val !== null) {
        let valScaled = scale(val, palette, paletteExtent)
        let marker = new L.CircleMarker(coord, {
            color: `rgb(${red[valScaled]}, ${green[valScaled]}, ${blue[valScaled]})`
          })
        this.addLayer(marker)        
      }
    }
    
    let polyline = L.polyline(points, {color: 'black'})
    
    this.addLayer(polyline)
  }
  
}

Trajectory.include(L.Mixin.Events)

// work-around for Babel bug, otherwise Trajectory cannot be referenced here
export { Trajectory as default }
