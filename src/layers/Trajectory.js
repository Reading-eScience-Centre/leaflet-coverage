import L from 'leaflet'
import {isDomain, fromDomain, minMaxOfRange} from 'covutils'

import {enlargeExtentIfEqual} from './palettes.js'
import CoverageMixin from './CoverageMixin.js'
import PaletteMixin from './PaletteMixin.js'

import {DEFAULT_COLOR} from './Point.js'
  
/**
 * Renderer for Coverages and Domains with (domain) profile Trajectory.
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
export default class Trajectory extends PaletteMixin(CoverageMixin(L.FeatureGroup)) {
  
  // TODO FeatureGroup is not ideal since click events etc should not be blindly propagated
  //    (we use it for now to have getBounds() which LayerGroup misses)
  
  constructor (cov, options) {
    super()
    
    if (isDomain(cov)) {
      cov = fromDomain(cov)
      options.keys = [cov.parameters.keys().next().value]
    }
    
    if (!options.paletteExtent) {
      options.paletteExtent = 'full'
    }
    
    L.Util.setOptions(this, options)
    
    this.cov = cov
    this.param = options.keys ? cov.parameters.get(options.keys[0]) : null
    this.defaultColor = options.color || DEFAULT_COLOR
  }
  
  onAdd (map) {
    this._map = map
    
    this.load()
      .then(() => this.initializePalette())
      .then(() => {
        this._addTrajectoryLayers()
        this.fire('add')
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
  
  computePaletteExtent (extent) {
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

    extent = minMaxOfRange(range)
    extent = enlargeExtentIfEqual(extent)    
    return Promise.resolve(extent)
  }
  
  _addTrajectoryLayers () {
    // add a Polyline in black, and coloured CircleMarker's for each domain point
    let points = this.getLatLngs()
    for (let i=0; i < points.length; i++) {
      let marker = new L.CircleMarker(points[i], {
        color: this._getColor(this._getValue(i)),
        opacity: 1,
        fillOpacity: 1
      })
      this.addLayer(marker)
    }
    
    let polyline = L.polyline(points, {
      color: 'black',
      weight: 3
    })
    
    this.addLayer(polyline)
  }
  
  /**
   * Returns the trajectory points as LatLng objects in the order they appear in the composite domain axis.
   */
  getLatLngs () {
    let axis = this.domain.axes.get('composite')
    let ix = axis.components.indexOf(this._projX)
    let iy = axis.components.indexOf(this._projY)
    let coords = []
    for (let i=0; i < axis.values.length; i++) {
      let x = axis.values[i][ix]
      let y = axis.values[i][iy]
      let latlng = this.projection.unproject({x,y})
      let coord = L.latLng(latlng)
      coords.push(coord)
    }
    return coords
  }
  
  /**
   * Return the displayed value closest to the circle centre.
   * If no point exists within the circle, undefined is returned,
   * otherwise a number or null (for no-data).
   */
  getValueAt (latlng, maxDistance) {
    let points = this.getLatLngs()
    let distances = points.map(p => p.distanceTo(latlng))
    let minDistance = Infinity
    let minIdx
    for (let i=0; i < points.length; i++) {
      let distance = distances[i]
      if (distance <= maxDistance && distance < minDistance) {
        minDistance = distance
        minIdx = i
      }
    }
    if (minIdx !== undefined) {
      return this._getValue(minIdx)
    }
  }
  
  _getValue (index) {
    if (this.param) {
      return this.range.get({composite: index})
    }
  }
  
  // NOTE: this returns a string, not an {r,g,b} object as in other classes!
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
      return `rgb(${red[idx]}, ${green[idx]}, ${blue[idx]})`
    }
  }
  
  redraw () {
    this.clearLayers()
    this._addTrajectoryLayers()
  }
  
}
