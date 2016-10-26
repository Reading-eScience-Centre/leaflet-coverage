import L from 'leaflet'
import {isDomain, fromDomain, indexOfNearest, minMaxOfRange} from 'covutils'

import {enlargeExtentIfEqual} from './palettes.js'
import {CoverageMixin} from './CoverageMixin.js'
import {CircleMarkerMixin} from './CircleMarkerMixin.js'
import {PaletteMixin} from './PaletteMixin.js'
import {EventMixin} from '../util/EventMixin.js'

import {DEFAULT_COLOR} from './Point.js'

// TODO nearly identical to VerticalProfile

/**
 * Renderer for Coverages conforming to the CovJSON domain type `PointSeries`.
 * 
 * This will simply display a dot on the map and fire a click event when a user clicks on it.
 * The dot either has a defined standard color, or it uses a palette if a parameter is chosen.
 * 
 * @example
 * var cov = ... // get Coverage data
 * var layer = new C.PointSeries(cov, {
 *   parameter: 'salinity',
 *   time: new Date('2015-01-01T12:00:00Z'),
 *   defaultColor: 'black',
 *   palette: C.linearPalette(['#FFFFFF', '#000000'])
 * })
 * 
 * @see https://covjson.org/domain-types/#pointseries
 * 
 * @emits {DataLayer#afterAdd} Layer is initialized and was added to the map
 * @emits {DataLayer#dataLoading} Data loading has started
 * @emits {DataLayer#dataLoad} Data loading has finished (also in case of errors)
 * @emits {DataLayer#error} Error when loading data
 * @emits {PaletteMixin#paletteChange} Palette has changed
 * @emits {PaletteMixin#paletteExtentChange} Palette extent has changed
 * @emits {Point#click} when the point was clicked
 * 
 * @extends {L.Layer}
 * @extends {CoverageMixin}
 * @extends {CircleMarkerMixin}
 * @extends {PaletteMixin}
 * @implements {DataLayer}
 * @implements {PointDataLayer}
 */
export class PointSeries extends PaletteMixin(CircleMarkerMixin(CoverageMixin(L.Layer))) {
  
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
   * @param {boolean} [options.showNoData=false] Whether to draw the point if there is no data.
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

    /** @ignore */
    this.showNoData = options.showNoData // if true, draw with default color
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
        this._addMarker()
        this.fire('afterAdd')
      })
  }
  
  _loadCoverageSubset () {
    // adapted from Grid.js
    let t = this._axesSubset.t
    if (t.coordPref == undefined) {
      t.idx = t.coord = undefined
    } else {
      let vals = this.domain.axes.get('t').values.map(v => v.getTime())
      t.idx = indexOfNearest(vals, t.coordPref.getTime())
      t.coord = vals[t.idx]
    }
    
    // Note that we don't subset the coverage currently, since there is no real need for it
  }
  
  /**
   * @ignore
   * @override
   */
  onRemove () {
    this._removeMarker()
  }
  
  /**
   * Returns the geographic bounds of the coverage, which is a degenerate box collapsed to a point.
   * 
   * @return {L.LatLngBounds}
   */
  getBounds () {
    return L.latLngBounds([this.getLatLng()])
  }
  
  /**
   * Returns the geographical position of the coverage.
   * 
   * @return {L.LatLng}
   */
  getLatLng () {
    let x = this.domain.axes.get(this._projX).values[0]
    let y = this.domain.axes.get(this._projY).values[0]
    let latlng = this.projection.unproject({x,y})
    return L.latLng(latlng)
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
    this._axesSubset.t.coordPref = val ? val.toISOString() : undefined
    
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
        throw new Error('palette extent cannot be set when no parameter has been chosen')
      }
      
      extent = minMaxOfRange(this.range)
      extent = enlargeExtentIfEqual(extent)
      return Promise.resolve(extent)
    } else {
      throw new Error('Unknown extent specification: ' + extent)
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
   * Return the displayed value if within the given distance of the reference point.
   * If out of bounds, then undefined is returned, otherwise a number or null (for no data).
   * 
   * @param {L.LatLng} latlng
   * @param {number} maxDistance Maximum distance in meters between both points.
   * @returns {number|null|undefined}
   */
  getValueAt (latlng, maxDistance) {
    let point = this.getLatLng()
    if (point.distanceTo(latlng) <= maxDistance) {
      return this.getValue()
    }
  }
  
  _getColor () {
    let val = this.getValue()
    if (val === null) {
      // no-data
      return this._defaultColor
    } else if (val === undefined) {
      // not fixed to a param or z-coordinate
      return this._defaultColor
    } else {
      // use a palette
      let idx = this.getPaletteIndex(val)
      let {red, green, blue} = this.palette
      return {r: red[idx], g: green[idx], b: blue[idx]}
    }
  }
}
