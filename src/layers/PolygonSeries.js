import L from 'leaflet'
import {indexOfNearest, minMaxOfRange, isDomain, fromDomain, ensureClockwisePolygon, getPointInPolygonsFn} from 'covutils'

import {enlargeExtentIfEqual} from './palettes.js'
import CoverageMixin from './CoverageMixin.js'
import EventMixin from '../util/EventMixin.js'
import PaletteMixin from './PaletteMixin.js'

import {DEFAULT_COLOR} from './Point.js'

// TODO nearly identical to VerticalProfile

/**
 * Renderer for Coverages with domain type Profile.
 * 
 * This will simply display a dot on the map and fire a click
 * event when a user clicks on it.
 * The dot either has a defined standard color, or it uses
 * a palette together with a target depth if a parameter is chosen.
 */
export default class PolygonSeries extends PaletteMixin(CoverageMixin(L.Layer)) {
  
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

    this.cov = cov
    this.param = options.keys ? cov.parameters.get(options.keys[0]) : null
    this._axesSubset = {
      t: {coordPref: options.time}
    }
    this.defaultColor = options.color ? options.color : DEFAULT_COLOR
  }
  
  onAdd (map) {
    this._map = map

    this.load()
      .then(() => this.initializePalette())
      .then(() => {
        this._unproject()
        this._addPolygon()
        this._pointInPolygonPreprocess()
        this.fire('dataLoad', { init: true })
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
  
  onRemove () {
    this._removePolygon()
  }
  
  getBounds () {
    return this._geojson.getBounds()
  }
  
  getLatLng () {
    return this.getBounds().getCenter()
  }
  
  bindPopup (...args) {
    this._popup = args
    if (this._geojson) {
      this._geojson.bindPopup(...args)
    }
    return this
  }
  
  openPopup () {
    this._geojson.openPopup()
    return this
  }
  
  closePopup () {
    this._geojson.closePopup()
    return this
  }
  
  get coverage () {
    return this.cov
  }
    
  get parameter () {
    return this.param
  }
  
  /**
   * Sets the currently active time to the one closest to the given Date object.
   * Throws an exception if there is no time axis.
   */
  set time (val) {
    let old = this.time
    this._axesSubset.t.coordPref = val.toISOString()
    
    this._loadCoverageSubset().then(() => {
      if (old === this.time) return
      this.redraw()
      this.fire('axisChange', {axis: 'time'})
    })
  }
  
  /**
   * The currently active time on the temporal axis as Date object, 
   * or undefined if the grid has no time axis.
   */
  get time () {
    if (!this._axesSubset.t.coord) {
      return
    }
    let time = this.domain.axes.get('t').values[this._axesSubset.t.idx]
    return new Date(time)
  }
  
  get timeSlices () {
    return this.domain.axes.get('t').values.map(t => new Date(t))
  }
    
  canUsePalette () {
    return this.time !== undefined
  }
    
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
    
  /**
   * Return the displayed value (number, or null for no-data),
   * or undefined if not fixed to a t-coordinate or parameter.
   */
  getValue () {
    if (this.param && this._axesSubset.t.coord !== undefined) {
      let val = this.range.get({t: this._axesSubset.t.idx})
      return val
    }    
  }
  
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
      return this.defaultColor
    } else if (val === undefined) {
      // not fixed to a param or z-coordinate
      return this.defaultColor
    } else {
      // use a palette
      let idx = this.getPaletteIndex(val)
      let {red, green, blue} = this.palette
      return `rgb(${red[idx]}, ${green[idx]}, ${blue[idx]})`
    }
  }
  
  _updatePolygon () {
    this._removePolygon()
    this._addPolygon()
  }
  
  redraw () {
    this._updatePolygon()
    this._geojson.redraw()
  }
}
