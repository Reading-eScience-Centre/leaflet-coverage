import L from 'leaflet'
import {enlargeExtentIfEqual} from './palettes.js'

import {CoverageMixin} from './CoverageMixin.js'
import {CircleMarkerMixin} from './CircleMarkerMixin.js'
import {PaletteMixin} from './PaletteMixin.js'
import {EventMixin} from '../util/EventMixin.js'

import {isDomain, fromDomain} from 'covutils'

/** @ignore */
export const DEFAULT_COLOR = 'black'

/**
 * The `click` event, signalling that the point has been clicked.
 * 
 * @typedef {L.Event} Point#click
 * @property {Coverage} coverage
 */

/**
 * Renderer for Coverages and Domains conforming to CovJSON domain type `Point`.
 * 
 * This will simply display a dot on the map and fire a click event when a user clicks on it.
 * The dot either has a defined standard color, or it uses a palette if a parameter is chosen.
 * 
 * @example
 * var cov = ... // get Coverage data
 * var layer = new C.Point(cov, {
 *   parameter: 'salinity',
 *   defaultColor: 'black',
 *   palette: C.linearPalette(['#FFFFFF', '#000000'])
 * })
 * 
 * @see https://covjson.org/domain-types/#point
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
export class Point extends PaletteMixin(CircleMarkerMixin(CoverageMixin(L.Layer))) {
  
  /**
   * @param {Coverage|Domain} cov The coverage or domain object to visualize.
   * @param {Object} [options] The options object.
   * @param {string} [options.parameter] The key of the parameter to display, not needed for domain objects.
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
   * See {@link PaletteMixin}.
   * 
   * @ignore
   */
  computePaletteExtent (extent) {
    if (extent === 'full') {
      if (!this.parameter) {
        throw new Error('palette extent cannot be computed when no parameter has been chosen')
      }
  
      let val = this.getValue()
      extent = enlargeExtentIfEqual([val, val])
      return Promise.resolve(extent)
    } else {
      throw new Error('Unknown extent specification: ' + extent)
    }
  }
  
  /**
   * Return the displayed value (number, or null for no-data),
   * or undefined if no parameter is set.
   * 
   * @returns {number|null|undefined}
   */
  getValue () {
    if (this._param) {
      return this.range.get({})
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
      return {r: red[idx], g: green[idx], b: blue[idx]}
    }
  }
}
