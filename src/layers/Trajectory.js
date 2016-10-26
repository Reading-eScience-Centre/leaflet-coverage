import L from 'leaflet'
import {isDomain, fromDomain, minMaxOfRange} from 'covutils'

import {enlargeExtentIfEqual} from './palettes.js'
import {CoverageMixin} from './CoverageMixin.js'
import {PaletteMixin} from './PaletteMixin.js'

import {DEFAULT_COLOR} from './Point.js'
  
/**
 * Renderer for Coverages and Domains conforming to the CovJSON domain type `Trajectory`.
 * 
 * Displays the trajectory as a path with coloured points using
 * a given palette for a given parameter.
 * 
 * @see https://covjson.org/domain-types/#trajectory
 * 
 * @emits {DataLayer#afterAdd} Layer is initialized and was added to the map
 * @emits {DataLayer#dataLoading} Data loading has started
 * @emits {DataLayer#dataLoad} Data loading has finished (also in case of errors)
 * @emits {DataLayer#error} Error when loading data
 * @emits {PaletteMixin#paletteChange} Palette has changed
 * @emits {PaletteMixin#paletteExtentChange} Palette extent has changed
 * @emits {Point#click} when a point was clicked
 * 
 * @extends {L.FeatureGroup}
 * @extends {CoverageMixin}
 * @extends {PaletteMixin}
 * @implements {DataLayer}
 * 
 */
export class Trajectory extends PaletteMixin(CoverageMixin(L.FeatureGroup)) {
  
  // TODO FeatureGroup is not ideal since click events etc should not be blindly propagated
  //    (we use it for now to have getBounds() which LayerGroup misses)
  
  /**
   * @example
   * var cov = ... // get Coverage data
   * var layer = new C.Trajectory(cov, {
   *   keys: ['salinity'],
   *   defaultColor: 'black',
   *   palette: C.linearPalette(['#FFFFFF', '#000000'])
   * })
   * 
   * @param {Coverage|Domain} cov The coverage or domain object to visualize.
   * @param {Object} [options] The options object.
   * @param {Array<string>} [options.keys] The key of the parameter to display, not needed for domain objects.
   * @param {Palette} [options.palette] The initial color palette to use, the default depends on the parameter type.
   * @param {string} [options.paletteExtent='full'] The initial palette extent, either 'full' or specific: [-10,10].
   * @param {string} [options.defaultColor='black'] The color to use for missing data or if no parameter is set.
   */
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
    
    this._cov = cov
    this._param = options.keys ? cov.parameters.get(options.keys[0]) : null
    this._defaultColor = options.defaultColor || DEFAULT_COLOR
  }
  
  /**
   * @ignore
   * @override
   */
  onAdd (map) {
    this._map = map
    
    this.load()
      .then(() => this.initializePalette())
      .then(() => {
        this._addTrajectoryLayers()
        this.fire('afterAdd')
      })
  }
    
  /**
   * The coverage object associated to this layer.
   * 
   * @type {Coverage}
   */
  get coverage () {
    return this._cov
  }
  
  /**
   * The parameter that is visualized.
   * 
   * @type {Parameter}
   */
  get parameter () {
    return this._param
  }
  
  /**
   * See {@link PaletteMixin}.
   * 
   * @ignore
   */
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
   * 
   * @return {Array<L.LatLng>}
   */
  getLatLngs () {
    let axis = this.domain.axes.get('composite')
    let ix = axis.coordinates.indexOf(this._projX)
    let iy = axis.coordinates.indexOf(this._projY)
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
   * 
   * @param {L.LatLng} latlng
   * @param {number} maxDistance Maximum distance in meters between both points.
   * @returns {number|null|undefined}
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
    if (this._param) {
      return this.range.get({composite: index})
    }
  }
  
  // NOTE: this returns a string, not an {r,g,b} object as in other classes!
  _getColor (val) {
    if (val === null) {
      // no-data
      return this._defaultColor
    } else if (val === undefined) {
      // not fixed to a param
      return this._defaultColor
    } else {
      // use a palette
      let idx = this.getPaletteIndex(val)
      let {red, green, blue} = this.palette
      return `rgb(${red[idx]}, ${green[idx]}, ${blue[idx]})`
    }
  }
  
  /**
   * Redraw the layer.
   */
  redraw () {
    this.clearLayers()
    this._addTrajectoryLayers()
  }
  
}
