import L from 'leaflet'
import {isDomain, fromDomain, minMaxOfRange, ensureClockwisePolygon, getPointInPolygonsFn} from 'covutils'

import {enlargeExtentIfEqual} from './palettes.js'
import {PaletteMixin} from './PaletteMixin.js'
import {CoverageMixin} from './CoverageMixin.js'
import {EventMixin} from '../util/EventMixin.js'
  
/** @ignore */
export const DEFAULT_COLOR = 'black'

/**
 * The `click` event, signalling that a polygon has been clicked.
 * 
 * @typedef {L.MouseEvent} MultiPolygon#click
 * @property {number} index The axis index of the polygon that was clicked.
 * @property {L.LatLng} latlng The geographical point where the click event occured.
 */

/**
 * Renderer for Coverages and Domains conforming to CovJSON domain type `MultiPolygon`.
 *
 * @example
 * var cov = ... // get Coverage data
 * var layer = new C.MultiPolygon(cov, {
 *   parameter: 'salinity',
 *   defaultColor: 'black',
 *   palette: C.linearPalette(['#FFFFFF', '#000000'])
 * })
 * 
 * @see https://covjson.org/domain-types/#multipolygon
 * 
 * @emits {DataLayer#afterAdd} Layer is initialized and was added to the map
 * @emits {DataLayer#dataLoading} Data loading has started
 * @emits {DataLayer#dataLoad} Data loading has finished (also in case of errors)
 * @emits {DataLayer#error} Error when loading data
 * @emits {PaletteMixin#paletteChange} Palette has changed
 * @emits {PaletteMixin#paletteExtentChange} Palette extent has changed
 * @emits {MultiPolygon#click} when a polygon was clicked
 * 
 * @extends {L.Layer}
 * @extends {CoverageMixin}
 * @extends {PaletteMixin}
 * @implements {DataLayer}
 */
export class MultiPolygon extends PaletteMixin(CoverageMixin(L.Layer)) {
  
  /**
   * The key of the parameter to display can be given in the 'parameter' options property,
   * it will be ignored if the coverage data object is a Domain object.
   * 
   * @param {Coverage|Domain} cov The coverage or domain object to visualize.
   * @param {Object} [options] The options object.
   * @param {string} [options.parameter] The key of the parameter to display, not needed for domain objects.
   * @param {Palette} [options.palette] The initial color palette to use, the default depends on the parameter type.
   * @param {string} [options.paletteExtent='full'] The initial palette extent, either 'full' or specific: [-10,10].
   * @param {string} [options.defaultColor='black'] The color to use for missing data or if no parameter is set.
   */
  constructor (cov, options) {
    super()
    
    if (isDomain(cov)) {
      cov = fromDomain(cov)
      options.parameter = cov.parameters.keys().next().value
      delete options.keys
    }
    
    if (!options.paletteExtent) {
      options.paletteExtent = 'full'
    }
    
    L.Util.setOptions(this, options)
    
    this._cov = cov
    let paramKey = options.keys ? options.keys[0] : options.parameter
    this._param = paramKey ? cov.parameters.get(paramKey) : null
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
        this._unproject()
        this._addPolygons()
        this._pointInPolygonPreprocess()
        this.fire('afterAdd')
    })
  }
  
  _unproject () {
    let unproject = this.projection.unproject
    let axis = this.domain.axes.get('composite')
    let ix = axis.coordinates.indexOf(this._projX)
    let iy = axis.coordinates.indexOf(this._projY)

    this._polygonsLonLat = axis.values.map(polygon => polygon.map(ring => ring.map(coords => {
      let {lat,lon} = unproject({x: coords[ix], y: coords[iy]})
      return [lon,lat]
    })))
  }
  
  /**
   * @ignore
   * @override
   */
  onRemove (map) {
    this._removePolygons()
  }
  
  
  /**
   * Returns the geographic bounds of the coverage.
   * 
   * @return {L.LatLngBounds}
   */
  getBounds () {
    return this._geojson.getBounds()
  }
  
  /**
   * Returns the geographical center position of the coverage based on its bounding box.
   * 
   * @return {L.LatLng}
   */
  getLatLng () {
    return this.getBounds().getCenter()
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
    if (extent === 'full') {
      if (!this.parameter) {
        throw new Error('palette extent cannot be computed when no parameter has been chosen')
      }
    
      extent = minMaxOfRange(this.range)
      extent = enlargeExtentIfEqual(extent)
      return Promise.resolve(extent)
    } else {
      throw new Error('Unknown extent specification: ' + extent)
    }
  }
  
  _pointInPolygonPreprocess () {
    let polygons = this._polygonsLonLat
    // TODO we assume spherical coordinates for now
    let isCartesian = false
    // A bit evil since this modifies in-place, but nothing bad should happen.
    polygons.forEach(p => ensureClockwisePolygon(p, isCartesian))
    this._pointInPolygons = getPointInPolygonsFn(polygons)
  }
  
  _addPolygons () {
    let polygons = this._polygonsLonLat
    
    let geojson = []
    for (let i=0; i < polygons.length; i++) {
      geojson.push({
        "type": "Feature",
        "properties": {
          "index": i,
          "color": this._getColor(this._getValue(i))
        },
        "geometry": {
          "type": "Polygon",
          "coordinates": polygons[i]
        }
      })
    }
    
    this._geojson = L.geoJson(geojson, {
      style: feature => ({
        color: feature.properties.color,
        fillOpacity: 1,
        stroke: false
      }),
      onEachFeature: (feature, layer) => {
        layer.on('click', e => {
          e.index = feature.properties.index
          this.fire('click', e)
        })
      }
    })
    
    this._geojson.addTo(this._map)
  }
  
  _removePolygons () {
    this._map.removeLayer(this._geojson)
    delete this._geojson
  }
  
  _getValue (index) {
    if (this._param) {
      return this.range.get({composite: index})
    }
  }
  
  /**
   * Return the displayed value at a given geographic position.
   * If out of bounds, then undefined is returned, otherwise a number or null (for no data).
   * 
   * @param {L.LatLng} latlng
   * @returns {number|null|undefined}
   */
  getValueAt (latlng) {
    // TODO longitude wrapping
    let i = this._pointInPolygons([latlng.lng, latlng.lat])
    if (i >= 0) {
      return this._getValue(i)
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
  
  _updatePolygons () {
    this._removePolygons()
    this._addPolygons()
  }
  
  /**
   * Redraw the layer.
   */
  redraw () {
    this._updatePolygons()
    this._geojson.redraw()
  }
  
}
