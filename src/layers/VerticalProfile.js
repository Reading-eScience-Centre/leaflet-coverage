import L from 'leaflet'
import {isDomain, fromDomain, indexOfNearest, minMaxOfRange} from 'covutils'

import {enlargeExtentIfEqual} from './palettes.js'
import {CoverageMixin} from './CoverageMixin.js'
import {CircleMarkerMixin} from './CircleMarkerMixin.js'
import {PaletteMixin} from './PaletteMixin.js'
import {EventMixin} from '../util/EventMixin.js'

import {DEFAULT_COLOR} from './Point.js'

/**
 * Renderer for Coverages conforming to the CovJSON domain type `VerticalProfile`.
 * 
 * This will simply display a dot on the map and fire a click event when a user clicks on it.
 * The dot either has a defined standard color, or it uses
 * a palette together with a target depth if a parameter is chosen.
 * 
 * @see https://covjson.org/domain-types/#verticalprofile
 * 
 * @emits {DataLayer#afterAdd} Layer is initialized and was added to the map
 * @emits {DataLayer#dataLoading} Data loading has started
 * @emits {DataLayer#dataLoad} Data loading has finished (also in case of errors)
 * @emits {DataLayer#error} Error when loading data
 * @emits {DataLayer#axisChange} Axis coordinate has changed (e.axis === 'vertical')
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
export class VerticalProfile extends PaletteMixin(CircleMarkerMixin(CoverageMixin(L.Layer))) {
  
  /**
   * An optional vertical axis target value can be defined with the 'vertical' property.
   * The closest values on the vertical axis is chosen.
   * 
   * @example
   * var cov = ... // get Coverage data
   * var layer = new C.VerticalProfile(cov, {
   *   keys: ['salinity'],
   *   vertical: 30,
   *   defaultColor: 'black',
   *   palette: C.linearPalette(['#FFFFFF', '#000000'])
   * })
   * 
   * @param {Coverage|Domain} cov The coverage or domain object to visualize.
   * @param {Object} [options] The options object.
   * @param {Array<string>} [options.keys] The key of the parameter to display, not needed for domain objects.
   * @param {number} [options.vertical] The initial vertical slice to display.
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
    }
    
    if (!options.paletteExtent) {
      options.paletteExtent = 'full'
    }
    
    L.Util.setOptions(this, options)

    this._cov = cov
    this._param = options.keys ? cov.parameters.get(options.keys[0]) : null
    this._axesSubset = {
      z: {coordPref: options.vertical}
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
    let z = this._axesSubset.z
    if (z.coordPref == undefined) {
      z.idx = z.coord = undefined
    } else {
      let vals = this.domain.axes.get('z').values
      z.idx = indexOfNearest(vals, z.coordPref)
      z.coord = vals[z.idx]
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
   * The currently active vertical coordinate, or undefined if no coordinate is set.
   * 
   * @type {number|undefined}
   */
  get vertical () {
    return this._axesSubset.z.coord
  }
  
  /**
   * Sets the currently active vertical coordinate to the one closest to the given value.
   * 
   * @type {number|undefined}
   */
  set vertical (val) {
    this._axesSubset.z.coordPref = val
    this._loadCoverageSubset()
    this.redraw()
    this.fire('axisChange', {axis: 'vertical'}) 
  }
  
  /**
   * The vertical slices that make up the coverage.
   * 
   * @type {Array<number>}
   */
  get verticalSlices () {
    let vals = this.domain.axes.get('z').values
    if (ArrayBuffer.isView(vals)) {
      // convert to plain Array to allow easier use
      vals = [...vals]
    }
    return vals
  }
    
  /**
   * See {@link PaletteMixin}.
   * 
   * @ignore
   */
  canUsePalette () {
    return this.vertical !== undefined
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
   * or undefined if not fixed to a z-coordinate or parameter.
   * 
   * @returns {number|null|undefined}
   */
  getValue () {
    if (this._param && this._axesSubset.z.coord !== undefined) {
      let val = this.range.get({z: this._axesSubset.z.idx})
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
      let {red, green, blue} = this.palette
      return {r: red[idx], g: green[idx], b: blue[idx]}
    }
  }
}
