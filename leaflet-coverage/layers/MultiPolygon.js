import L from 'leaflet'
import {linearPalette, scale} from './palettes.js'
import * as rangeutil from '../util/range.js'
import * as referencingutil from '../util/referencing.js'
import EventMixin from '../util/EventMixin.js'

import {isDomain} from 'covutils/lib/validate.js'
import {toCoverage} from 'covutils/lib/transform.js'

const DEFAULT_PALETTE = linearPalette(['#deebf7', '#3182bd']) // blues
  
/**
 * Renderer for Coverages and Domains with (domain) profile MultiPolygon.
 */
export default class MultiPolygon extends EventMixin(L.Class) {
  
  constructor (cov, options) {
    super()
    
    if (isDomain(cov)) {
      cov = toCoverage(cov)
      options.keys = [cov.parameters.keys().next.value]
    }
    
    this.cov = cov
    this.param = cov.parameters.get(options.keys[0])
    
    this._palette = options.palette || DEFAULT_PALETTE
    if (Array.isArray(options.paletteExtent)) {
      this._paletteExtent = options.paletteExtent
    } else {
      this._paletteExtent = 'full'
    }
  }
  
  load () {
    this.fire('dataLoading') // for supporting loading spinners
    
    function checkWGS84 (domain) {
      let srs = referencingutil.getRefSystem(domain, ['x', 'y'])
      if (!referencingutil.isGeodeticWGS84CRS(srs)) {
        throw new Error('Unsupported CRS, must be WGS84')
      }
    }
    
    let promise = Promise.all([this.cov.loadDomain(), this.cov.loadRange(this.param.key)]).then(([domain, range]) => {
      this.domain = domain
      checkWGS84(domain)
      this.range = range
      this._updatePaletteExtent(this._paletteExtent)
      this.fire('dataLoad')
    }).catch(e => {
      console.error(e)
      this.fire('error', e)
      
      this.fire('dataLoad')
    })
    
    return promise
  }
  
  onAdd (map) {
    this._map = map
    
    this.load().then(() => {
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
    
  set palette (p) {
    this._palette = p
    this.redraw()
    this.fire('paletteChange')
  }
  
  get palette () {
    return this.param ? this._palette : null
  }
  
  set paletteExtent (extent) {
    this._updatePaletteExtent(extent)
    this.redraw()
    this.fire('paletteExtentChange')
  }
  
  get paletteExtent () {
    return this._paletteExtent
  }
  
  _updatePaletteExtent (extent) {
    if (Array.isArray(extent) && extent.length === 2) {
      this._paletteExtent = extent
      return
    }
    
    this._paletteExtent = rangeutil.minMax(this.range)
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
          "color": this._getColor(i)
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
  
  _getColor (index) {
    // use a palette
    let val = this.range.get({composite: index})
    if (val !== null) {
      let valScaled = scale(val, this.palette, this.paletteExtent)        
      let {red, green, blue} = this.palette
      return `rgb(${red[valScaled]}, ${green[valScaled]}, ${blue[valScaled]})`
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
