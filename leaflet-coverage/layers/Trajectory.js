import L from 'leaflet'
import {linearPalette, scale} from './palettes.js'
import * as rangeutil from '../util/range.js'
import * as referencingutil from '../util/referencing.js'

const DEFAULT_PALETTE = linearPalette(['#deebf7', '#3182bd']) // blues
  
/**
 * Renderer for Coverages with domain type Trajectory.
 * 
 * Displays the trajectory as a path with coloured points using
 * a given palette for a given parameter.
 * 
 * Events:
 * "add" - Layer is initialized and is about to be added to the map
 * "remove" - Layer is removed from the map
 * "dataLoading" - Data loading has started
 * "dataLoad" - Data loading has finished (also in case of errors)
 * "error" - Error when loading data
 * "paletteChange" - Palette has changed
 * "paletteExtentChange" - Palette extent has changed
 * 
 */
export default class Trajectory extends L.FeatureGroup {
  
  // TODO FeatureGroup is not ideal since click events etc should not be blindly propagated
  //    (we use it for now to have getBounds() which LayerGroup misses)
  
  constructor (cov, options) {
    super()
    
    this.cov = cov
    this.param = cov.parameters.get(options.keys[0])
    
    if (this.param.categories) {
      throw new Error('category parameters are currently not supported for Trajectory')
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
  }
  
  onAdd (map) {
    this._map = map
    this.fire('dataLoading') // for supporting loading spinners
    Promise.all([this.cov.loadDomain(), this.cov.loadRange(this.param.key)])
      .then(([domain, range]) => {
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
        this.fire('dataLoad')
      })
      .catch(e => {
        console.error(e)
        this.fire('error', e)
        
        this.fire('dataLoad')
      })      
  }
  
  onRemove (map) {
    this.fire('remove')
    super.onRemove(map)
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
    return this._palette
  }
  
  set paletteExtent (extent) {
    this._updatePaletteExtent(extent)
    this.redraw()
    this.fire('paletteExtentChange')
  }
  
  get paletteExtent () {
    return this._paletteExtent
  }
  
  /**
   * Return the displayed value closest to the circle centre.
   * If no point exists within the circle, undefined is returned,
   * otherwise a number or null (for no-data).
   */
  getValueAt (latlng, radius) {
    // TODO implement    
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
  
  redraw () {
    this.clearLayers()
    this._addTrajectoryLayers()
  }
  
}
