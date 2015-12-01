import L from 'leaflet'
import {linearPalette, scale} from './palettes.js'
import * as arrays from '../util/arrays.js'
import * as rangeutil from '../util/range.js'
import * as referencingutil from '../util/referencing.js'

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
 * "add" - Layer is initialized and is about to be added to the map
 * "remove" - Layer is removed from the map
 * "error" - Error when loading data
 * "paletteChange" - Palette has changed
 * "paletteExtentChange" - Palette extent has changed
 * 
 */
class Trajectory extends L.FeatureGroup {
  
  // TODO FeatureGroup is not ideal since click events etc should not be blindly propagated
  //    (we use it for now to have getBounds() which LayerGroup misses)
  
  constructor (cov, options) {
    super()
    if (cov.domainType !== DOMAIN_TYPE) {
      throw new Error('Unsupported domain type: ' + cov.domainType + ', must be: ' + DOMAIN_TYPE)
    }
    this.cov = cov
    this.param = cov.parameters.get(options.keys[0])
    
    if (this.param.categories) {
      throw new Error('category parameters are currently not support for Trajectory')
    }
    
    this._palette = options.palette || DEFAULT_PALETTE
    if (options.paletteExtent === undefined || options.paletteExtent === 'subset') {
      this._paletteExtent = 'full'
    } else if (Array.isArray(options.paletteExtent) || ['full', 'fov'].indexOf(options.paletteExtent) !== -1) {
      this._paletteExtent = options.paletteExtent
    } else {
      throw new Error('paletteExtent must either be a 2-element array, ' +
          'one of "full", "subset" (identical to "full" for trajectories) or "fov", or be omitted')
    }
    // TODO remove code duplication
    switch (options.redraw) {
    case 'manual': this._autoRedraw = false; break
    case undefined:
    case 'onchange': this._autoRedraw = true; break
    default: throw new Error('redraw must be "onchange", "manual", or omitted (defaults to "onchange")')
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
        let srs = referencingutil.getRefSystem(domain, ['x', 'y'])
        if (!referencingutil.isGeodeticWGS84CRS(srs)) {
          throw new Error('Unsupported CRS, must be WGS84')
        }
        
        this.range = range
        this._updatePaletteExtent(this._paletteExtent)
        this._addTrajectoryLayers()
        this.fire('add')
        super.onAdd(map)
        map.fire('dataload')
      })
      .catch(e => {
        console.error(e)
        this.fire('error', e)
        
        map.fire('dataload')
      })      
  }
  
  onRemove (map) {
    this.fire('remove')
    console.log('removing trajectory from map')
    super.onRemove(map)
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

    let range = this.range
        
    if (extent === 'full') {
      // scan the whole range for min/max values
      
    } else if (extent === 'fov') {
      // scan the values that are currently in field of view on the map for min/max
      let bounds = this._map.getBounds()

      // TODO implement
      throw new Error('NOT IMPLEMENTED YET')      
    } else {
      throw new Error('Unknown extent specification: ' + extent)
    }

    this._paletteExtent = rangeutil.minMax(range)
  }
  
  _addTrajectoryLayers () {
    // add a Polyline in black, and coloured CircleMarker's for each domain point
    let composite = this.domain.axes.get('composite').values
    let range = this.range
    
    // TODO do coordinate transformation to lat/lon if necessary
    
    let palette = this.palette
    let {red, green, blue} = this.palette
    let paletteExtent = this.paletteExtent
    
    let coords = []
    for (let i=0; i < composite.length; i++) {
      let val = range.get({composite: i})
      // this always has to be lat/lon, no matter which map projection is used
      let x = composite[i][1]
      let y = composite[i][2]
      let coord = new L.LatLng(y, x)
      coords.push(coord)
      if (val !== null) {
        let valScaled = scale(val, palette, paletteExtent)
        let marker = new L.CircleMarker(coord, {
            color: `rgb(${red[valScaled]}, ${green[valScaled]}, ${blue[valScaled]})`,
            opacity: 1,
            fillOpacity: 1
          })
        this.addLayer(marker)
      }
    }
    
    let polyline = L.polyline(coords, {
        color: 'black',
        weight: 3
      })
    
    this.addLayer(polyline)
  }
  
  _doAutoRedraw () {
    if (this._autoRedraw) {
      this.redraw()
    }
  }
  
  redraw () {
    this.clearLayers()
    this._addTrajectoryLayers()
  }
  
}

Trajectory.include(L.Mixin.Events)

// work-around for Babel bug, otherwise Trajectory cannot be referenced here
export { Trajectory as default }
