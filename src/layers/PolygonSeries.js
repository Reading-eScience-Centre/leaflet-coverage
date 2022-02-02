import L from 'leaflet'
import {indexOfNearest, minMaxOfRange, isDomain, fromDomain, ensureClockwisePolygon, getPointInPolygonsFn, asTime} from 'covutils'

import {enlargeExtentIfEqual} from './palettes.js'
import {CoverageMixin} from './CoverageMixin.js'
import {EventMixin} from '../util/EventMixin.js'
import {PaletteMixin} from './PaletteMixin.js'

import {DEFAULT_COLOR} from './Point.js'

// TODO nearly identical to VerticalProfile

/**
 * Renderer for Coverages conforming to the CovJSON domain type `PolygonSeries`.
 * 
 * @example
 * var cov = ... // get Coverage data
 * var layer = new C.PolygonSeries(cov, {
 *   parameter: 'salinity',
 *   time: new Date('2015-01-01T12:00:00Z'),
 *   defaultColor: 'black',
 *   palette: C.linearPalette(['#FFFFFF', '#000000'])
 * })
 * 
 * @see https://covjson.org/domain-types/#polygonseries
 * 
 * @emits {DataLayer#afterAdd} Layer is initialized and was added to the map
 * @emits {DataLayer#dataLoading} Data loading has started
 * @emits {DataLayer#dataLoad} Data loading has finished (also in case of errors)
 * @emits {DataLayer#error} Error when loading data
 * @emits {DataLayer#axisChange} Axis coordinate has changed (e.axis === 'time')
 * @emits {PaletteMixin#paletteChange} Palette has changed
 * @emits {PaletteMixin#paletteExtentChange} Palette extent has changed
 * @emits {Point#click} when the polygon was clicked
 * 
 * @extends {L.Layer}
 * @extends {CoverageMixin}
 * @extends {PaletteMixin}
 * @implements {DataLayer}
 */
export class PolygonSeries extends PaletteMixin(CoverageMixin(L.Layer)) {
  
  /**
   * An optional time axis target value can be defined with the 'time' property.
   * The closest values on the time axis is chosen.
   * 
   * @param {Coverage|Domain} cov The coverage or domain object to visualize.
   * @param {Object} [options] The options object.
   * @param {string} [options.parameter] The key of the parameter to display, not needed for domain objects.
   * @param {Date} [options.time] The initial time step to display.
   * @param {Palette} [options.palette] The initial color palette to use, the default depends on the parameter type.
   * @param {string} [options.paletteExtent='full'] The initial palette extent, either 'full' or specific: [-10,10].
   * @param {string} [options.defaultColor='black'] The color to use for missing data or if no parameter is set.
   */
  constructor (cov, options) {
    super()
    
    if (isDomain(cov)) {
      cov = fromDomain(cov)
      delete options.keys
      options.parameter = cov.parameters.keys().next().value
    }
    
    if (!options.paletteExtent) {
      options.paletteExtent = 'full'
    }
    
    L.Util.setOptions(this, options)

    this._cov = cov
    let paramKey = options.keys ? options.keys[0] : options.parameter
    this._param = paramKey ? cov.parameters.get(paramKey) : null
    this._axesSubset = {
      t: {coordPref: options.time}
    }
    this._defaultColor = options.defaultColor || DEFAULT_COLOR
  }
  
  /**
   * @ignore
   * @override
   */
  onAdd (map) {
    this._map = map

    this.load()
      .then(() => this._updateTimeIndex())
      .then(() => this.initializePalette())
      .then(() => {
        this._unproject()
        this._addPolygon()
        this._pointInPolygonPreprocess()
        this.fire('afterAdd')
      })
  }
  
  _unproject () {
    let unproject = this.projection.unproject
    let axis = this.domain.axes.get('composite')
    let ix = axis.coordinates.indexOf(this._projX)
    let iy = axis.coordinates.indexOf(this._projY)
    
    this._polygonLonLat = axis.values[0].map(ring => ring.map(coords => {
      let {lat,lon} = unproject({x: coords[ix], y: coords[iy]})
      return [lon,lat]
    }))
  }
    
  _updateTimeIndex () {
    let t = this._axesSubset.t
    if (t.coordPref == undefined) {
      t.idx = t.coord = undefined
    } else {
      let vals = this.domain.axes.get('t').values.map(v => asTime(v))
      t.idx = indexOfNearest(vals, asTime(t.coordPref))
      t.coord = vals[t.idx]
    }
  }
  
  /**
   * @ignore
   * @override
   */
  onRemove () {
    this._removePolygon()
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
   * @ignore
   * @override
   */
  bindPopup (...args) {
    this._popup = args
    if (this._geojson) {
      this._geojson.bindPopup(...args)
    }
    return this
  }
  
  /**
   * @ignore
   * @override
   */
  openPopup () {
    this._geojson.openPopup()
    return this
  }
  
  /**
   * @ignore
   * @override
   */
  closePopup () {
    this._geojson.closePopup()
    return this
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
   * Sets the currently active time to the one closest to the given Date object.
   * 
   * @type {Date|undefined}
   */
  set time (val) {
    let old = this.time
    this._axesSubset.t.coordPref = val ? new Date(asTime(val)).toISOString() : undefined
    
    this._updateTimeIndex()
    if (old === this.time) return
    this._updatePolygon()
    this.fire('axisChange', {axis: 'time'})
  }
  
  /**
   * The currently active time on the temporal axis as Date object, 
   * or undefined if no time is set.
   * 
   * @type {Date|undefined}
   */
  get time () {
    if (!this._axesSubset.t.coord) {
      return
    }
    let time = this.domain.axes.get('t').values[this._axesSubset.t.idx]
    return new Date(time)
  }
  
  /**
   * The time slices that make up the coverage.
   * 
   * @type {Array<Date>}
   */
  get timeSlices () {
    return this.domain.axes.get('t').values.map(t => new Date(t))
  }
    
  /**
   * See {@link PaletteMixin}.
   * 
   * @ignore
   */
  canUsePalette () {
    return this.time !== undefined
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
    let polygon = this._polygonLonLat
    // TODO we assume spherical coordinates for now
    let isCartesian = false
    // A bit evil since this modifies in-place, but nothing bad should happen.
    ensureClockwisePolygon(polygon, isCartesian)
    let pointInPolygons = getPointInPolygonsFn([polygon])
    this._pointInPolygon = point => pointInPolygons(point) !== -1
  }
  
  _addPolygon () {
    let polygon = this._polygonLonLat
    let geojson = {
      "type": "Feature",
      "properties": {
        "color": this._getColor(this.getValue())
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": polygon
      }
    }
    
    this._geojson = L.geoJson(geojson, {
      style: feature => ({
        color: feature.properties.color,
        fillOpacity: 1,
        stroke: false
      }),
      onEachFeature: (feature, layer) => {
        layer.on('click', e => this.fire('click', e))
      }
    })
    
    if (this._popup) {
      this._geojson.bindPopup(...this._popup)
    }
    
    this._geojson.addTo(this._map)
  }
  
  _removePolygon () {
    this._map.removeLayer(this._geojson)
    delete this._geojson
  }

  _updatePolygon () {
    if(!this._geojson) return
    for (let layer of this._geojson.getLayers()) {
      layer.setStyle({
        fillColor: this._getColor(this.getValue()),
      })
    }
  }
    
  /**
   * Return the displayed value (number, or null for no-data),
   * or undefined if not fixed to a t-coordinate or parameter.
   * 
   * @returns {number|null|undefined}
   */
  getValue () {
    if (this._param && this._axesSubset.t.coord !== undefined) {
      let val = this.range.get({t: this._axesSubset.t.idx})
      return val
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
    if (!latlng) throw new Error('latlng parameter missing')
    
    // TODO longitude wrapping
    if (this._pointInPolygon([latlng.lng, latlng.lat])) {
      return this.getValue()
    }   
  }
  
  // NOTE: this returns a string, not an {r,g,b} object as in other classes!
  _getColor (val) {
    if (val === null) {
      // no-data
      return this._defaultColor
    } else if (val === undefined) {
      // not fixed to a param or z-coordinate
      return this._defaultColor
    } else {
      // use a palette
      let idx = this.getPaletteIndex(val)
      console.log('getting value', val, idx)
      let {red, green, blue} = this.palette
      return `rgb(${red[idx]}, ${green[idx]}, ${blue[idx]})`
    }
  }
  
  /**
   * Redraw the layer.
   */
  redraw () {
    this._removePolygon()
    this._addPolygon()
  }
}
