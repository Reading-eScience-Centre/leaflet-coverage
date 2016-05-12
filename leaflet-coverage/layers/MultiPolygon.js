import L from 'leaflet'
import {enlargeExtentIfEqual} from './palettes.js'
import PaletteMixin from './PaletteMixin.js'
import CoverageMixin from './CoverageMixin.js'
import * as rangeutil from '../util/range.js'
import EventMixin from '../util/EventMixin.js'

import {isDomain} from 'covutils/lib/validate.js'
import {toCoverage} from 'covutils/lib/transform.js'
  
/** @ignore */
export const DEFAULT_COLOR = 'black'

/**
 * Renderer for Coverages and Domains with (domain) profile MultiPolygon.
 */
export default class MultiPolygon extends PaletteMixin(CoverageMixin(EventMixin(L.Class))) {
  
  constructor (cov, options) {
    super()
    
    if (isDomain(cov)) {
      cov = toCoverage(cov)
      options.keys = [cov.parameters.keys().next.value]
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
        this._addPolygons()
        this.fire('add')
    })
  }
  
  onRemove (map) {
    this.fire('remove')
    this._removePolygons()
  }
  
  getBounds () {
    return this._geojson.getBounds()
  }
  
  getLatLng () {
    return this.getBounds().getCenter()
  }
    
  get coverage () {
    return this.cov
  }
  
  get parameter () {
    return this.param
  }
      
  computePaletteExtent (extent) {
    if (extent === 'full') {
      if (!this.parameter) {
        throw new Error('palette extent cannot be computed when no parameter has been chosen')
      }
    
      extent = rangeutil.minMax(this.range)
      extent = enlargeExtentIfEqual(extent)
      return Promise.resolve(extent)
    } else {
      throw new Error('Unknown extent specification: ' + extent)
    }
  }
  
  _addPolygons () {
    // TODO do coordinate transformation to lat/lon if necessary
    
    let polygons = this.domain.axes.get('composite').values
    
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
        layer.on('click', () => {
          this.fire('click', {index: feature.properties.index})
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
  
  _updatePolygons () {
    this._removePolygons()
    this._addPolygons()
  }
  
  redraw () {
    this._updatePolygons()
    this._geojson.redraw()
  }
  
}
