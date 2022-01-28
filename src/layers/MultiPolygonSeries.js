import L from 'leaflet'
import {indexOfNearest, minMaxOfRange, isDomain, fromDomain, ensureClockwisePolygon, getPointInPolygonsFn, asTime} from 'covutils'

import {enlargeExtentIfEqual} from './palettes.js'
import {CoverageMixin} from './CoverageMixin.js'
import {EventMixin} from '../util/EventMixin.js'
import {PaletteMixin} from './PaletteMixin.js'

import {DEFAULT_COLOR} from './Point.js'

// TODO nearly identical to PolygonSeries

/**
 * Renderer for Coverages conforming to the CovJSON domain type `MultiPolygonSeries`.
 * 
 * @example
 * var cov = ... // get Coverage data
 * var layer = new C.MultiPolygonSeries(cov, {
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
export class MultiPolygonSeries extends PaletteMixin(CoverageMixin(L.Layer)) {
  
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
    
  _loadCoverageSubset () {
    // adapted from Grid.js
    let t = this._axesSubset.t
    if (t.coordPref == undefined) {
      t.idx = t.coord = undefined
    } else {
      let vals = this.domain.axes.get('t').values.map(v => asTime(v))
      t.idx = indexOfNearest(vals, asTime(t.coordPref))
      t.coord = vals[t.idx]
    }

    this.coverage.loadRange(this.parameter.key).then(range => {
      this.range = range
    })
    
    // Note that we don't subset the coverage currently, since there is no real need for it
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
    
    this._loadCoverageSubset()
    if (old === this.time) return
    this.redraw()
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
  
  _removePolygon () {
    this._map.removeLayer(this._geojson)
    delete this._geojson
  }
    
  /**
   * Return the displayed value (number, or null for no-data),
   * or undefined if not fixed to a t-coordinate or parameter.
   * 
   * @returns {number|null|undefined}
   */
  _getValue (index) {
    if (this._param && this._axesSubset.t.coord !== undefined) {
      let val = this.range.get({t: this._axesSubset.t.idx, composite: index})
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
  
  _updatePolygon () {
    this._removePolygon()
    this._addPolygons()
  }
  
  /**
   * Redraw the layer.
   */
  redraw () {
    this._updatePolygon()
  }
}
