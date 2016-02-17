import L from 'leaflet'
import ndarray from 'ndarray'
import {linearPalette, directPalette, scale} from './palettes.js'
import * as arrays from '../util/arrays.js'
import * as rangeutil from '../util/range.js'
import * as referencingutil from '../util/referencing.js'
  
const DEFAULT_CONTINUOUS_PALETTE = () => linearPalette(['#deebf7', '#3182bd']) // blues
const DEFAULT_CATEGORICAL_PALETTE = n => linearPalette(['#e41a1c', '#377eb8', '#4daf4a', '#984ea3'], n)

/**
 * Renderer for Coverages with domain type Grid.
 * 
 * Events:
 * "add" - Layer is initialized and is about to be added to the map
 * "remove" - Layer is removed from the map
 * "dataLoading" - Data loading has started
 * "dataLoad" - Data loading has finished (also in case of errors)
 * "error" - Error when loading data
 * "paletteChange" - Palette has changed
 * "paletteExtentChange" - Palette extent has changed
 * "axisChange" - Axis coordinate has changed (e.axis === 'time'|'vertical')
 * "remove" - Layer is removed from the map
 * 
 */
export default class Grid extends L.TileLayer.Canvas {
  
  /**
   * The parameter to display must be given as the 'parameter' options property.
   * 
   * Optional time and vertical axis target values can be defined with the 'time' and
   * 'vertical' options properties. The closest values on the respective axes are chosen.
   * 
   * Example: 
   * <pre><code>
   * var cov = ... // get Coverage data
   * var layer = new GridCoverage(cov, {
   *   keys: ['salinity'],
   *   time: new Date('2015-01-01T12:00:00Z'),
   *   vertical: 50,
   *   palette: palettes.get('blues'),
   *   paletteExtent: 'full' // or 'subset' (time/vertical), 'fov' (map field of view), or specific: [-10,10]
   * })
   * </code></pre>
   */
  constructor (cov, options) {
    super()
    
    this.cov = cov
    this.param = cov.parameters.get(options.keys[0])
    this._axesSubset = { // x and y are not subsetted
        t: {coordPref: options.time ? options.time.toISOString() : undefined},
        z: {coordPref: options.vertical}
    }
    this._initCategoryIdxMap()
    
    let categories = this.param.observedProperty.categories
    
    if (options.palette) {
      this._palette = options.palette
    } else if (categories) {
      if (categories.every(cat => cat.preferredColor)) {
        this._palette = directPalette(categories.map(cat => cat.preferredColor))
      } else {
        this._palette = DEFAULT_CATEGORICAL_PALETTE(categories.length)
      }
    } else {
      this._palette = DEFAULT_CONTINUOUS_PALETTE()
    }
    
    if (categories && categories.length !== this._palette.steps) {
      throw new Error('Categorical palettes must match the number of categories of the parameter')
    }
    
    if (categories) {
      if (options.paletteExtent) {
        throw new Error('paletteExtent cannot be given for categorical parameters')
      }
    } else {
      if (!options.paletteExtent) {
        this._paletteExtent = 'subset'
      } else if (Array.isArray(options.paletteExtent) || ['subset', 'fov'].indexOf(options.paletteExtent) !== -1) {
        this._paletteExtent = options.paletteExtent
      } else {
        throw new Error('paletteExtent must either be a 2-element array, one of "subset" or "fov", or be omitted')
      }
    }
  }
  
  /**
   * Sets up a lookup table from categorical range value to palette index.
   */
  _initCategoryIdxMap () {
    if (!this.param.categoryEncoding) return
    
    // categorical parameter with integer encoding
    // Note: The palette order is equal to the categories array order.
    let max = -Infinity
    let min = Infinity
    let categories = this.param.observedProperty.categories
    let encoding = this.param.categoryEncoding
    for (let category of categories) {
      if (encoding.has(category.id)) {
        for (let val of encoding.get(category.id)) {
          max = Math.max(max, val)
          min = Math.min(min, val)
        }
      }
    }
    let valIdxMap
    if (categories.length < 256) {
      if (max > 10000 || min < 0) {
        // TODO implement fallback to Map implementation
        throw new Error('category values too high (>10000) or low (<0)')
      }
      valIdxMap = new Uint8Array(max+1)
      for (let i=0; i <= max; i++) {
        // the above length < 256 check ensures that no palette index is ever 255
        valIdxMap[i] = 255
      }
      
      for (let idx=0; idx < categories.length; idx++) {
        let category = categories[idx]
        if (encoding.has(category.id)) {
          for (let val of this.param.categoryEncoding.get(category.id)) {
            valIdxMap[val] = idx
          }
        }
      }
    } else {
      throw new Error('Too many categories: ' + categories.length)
    }
    this._categoryIdxMap = valIdxMap
  }
  
  onAdd (map) {
    // "loading" and "load" events are provided by the underlying TileLayer class
    
    this._map = map
    this.fire('dataLoading') // for supporting loading spinners
    this.cov.loadDomain()
      .then(domain => {
        this.domain = domain
        
        let srs = referencingutil.getRefSystem(domain, ['x', 'y'])
        if (!referencingutil.isGeodeticWGS84CRS(srs)) {
          throw new Error('Unsupported CRS, must be WGS84')
        }
      })
      .then(() => this._subsetByCoordinatePreference())
      .then(() => {
        this.errored = false
        this.fire('add')
        super.onAdd(map)
        this.fire('dataLoad')
      })
      .catch(e => {
        this.errored = true
        console.error(e)
        this.fire('error', e)
        super.onAdd(map)
        this.fire('dataLoad')
      })
  }
  
  onRemove (map) {
    delete this._map
    // TODO delete references to domain/range, caching logic should happen elsewhere
    this.fire('remove')
    super.onRemove(map)
  }
    
  getBounds () {
    let bbox
    if (this.cov.bbox) {
      bbox = this.cov.bbox
    } else if (this._isDomainUsingGeodeticWGS84CRS()) {
      bbox = this._getDomainBbox()
    } else {
      return
    }
    let southWest = L.latLng(bbox[1], bbox[0])
    let northEast = L.latLng(bbox[3], bbox[2])
    let bounds = new L.LatLngBounds(southWest, northEast)
    return bounds
  }
  
  /**
   * Subsets the temporal and vertical axes based on the _axesSubset.*.coordPref property,
   * which is regarded as a preference and does not have to exactly match a coordinate.
   * 
   * The return value is a promise that succeeds with an empty result and
   * sets this.subsetCov to the subsetted coverage.
   * The subsetting always fixes a single time and vertical slice, choosing the first
   * axis value if no preference was given.
   * 
   * After calling this method, _axesSubset.*.idx and _axesSubset.*.coord have
   * values from the actual axes.
   */
  _subsetByCoordinatePreference () {        
    let spec = {}
    for (let axis of Object.keys(this._axesSubset)) {
      let ax = this._axesSubset[axis]
      if (ax.coordPref == undefined && this.domain.axes.has(axis)) { // == also handles null
        spec[axis] = this.domain.axes.get(axis).values[0]
      } else {
        spec[axis] = {target: ax.coordPref}
      }
    }
    
    this.fire('dataLoading') // for supporting loading spinners
    return this.cov.subsetByValue(spec)
      .then(subsetCov => {
        this.subsetCov = subsetCov
        //  the goal is to avoid reloading data when approximating palette extent via subsetting
        //  but: memory has to be freed when the layer is removed from the map
        //      -> therefore cacheRanges is set on subsetCov whose reference is removed on onRemove
        subsetCov.cacheRanges = true
        return Promise.all([subsetCov.loadDomain(), subsetCov.loadRange(this.param.key)])
      })
      .then(([subsetDomain, subsetRange]) => {
        this.subsetDomain = subsetDomain
        this.subsetRange = subsetRange
        if (!this.param.observedProperty.categories) {
          return this._updatePaletteExtent(this._paletteExtent)
        }
      })
      .then(() => {
        this.fire('dataLoad')
      })
      .catch(e => {
        this.fire('dataLoad')
        throw e
      })
  }
  
  get parameter () {
    return this.param
  }
  
  /**
   * Sets the currently active time to the one closest to the given Date object.
   * Throws an exception if there is no time axis.
   */
  set time (val) {
    if (!this.domain.axes.has('t')) {
      throw new Error('No time axis found')
    }
    let old = this.time
    this._axesSubset.t.coordPref = val.toISOString()
    this._subsetByCoordinatePreference().then(() => {
      if (old === this.time) return
      this._redraw()
      this.fire('axisChange', {axis: 'time'})
    })
  }
  
  /**
   * The currently active time on the temporal axis as Date object, 
   * or undefined if the grid has no time axis.
   */
  get time () {
    if (this.domain.axes.has('t')) {
      let time = this.subsetDomain.axes.get('t').values[0]
      return new Date(time)
    }
  }
  
  get timeSlices () {
    if (this.domain.axes.has('t')) {
      return this.domain.axes.get('t').values.map(t => new Date(t))
    }
  }
  
  /**
   * Sets the currently active vertical coordinate to the one closest to the given value.
   */
  set vertical (val) {
    if (!this.domain.axes.has('z')) {
      throw new Error('No vertical axis found')
    }
    let old = this.vertical
    this._axesSubset.z.coordPref = val
    this._subsetByCoordinatePreference().then(() => {
      if (old === this.vertical) return
      this._redraw()
      this.fire('axisChange', {axis: 'vertical'}) 
    })  
  }
  
  /**
   * The currently active vertical coordinate as a number, 
   * or undefined if the grid has no vertical axis.
   */
  get vertical () {
    if (this.domain.axes.has('z')) {
      let val = this.subsetDomain.axes.get('z').values[0]
      return val
    }
  }
  
  get verticalSlices () {
    if (this.domain.axes.has('z')) {
      let vals = this.domain.axes.get('z').values
      if (ArrayBuffer.isView(vals)) {
        // convert to plain Array to allow easier use
        vals = [...vals]
      }
      return vals
    }
  }
   
  set palette (p) {
    this._palette = p
    this._redraw()
    this.fire('paletteChange')
  }
  
  get palette () {
    return this._palette
  }
  
  _updatePaletteExtent (extent) {
    let hasChanged = newExtent => {
      let oldExtent = this._paletteExtent
      if (!Array.isArray(oldExtent)) return true
      if (oldExtent[0] !== newExtent[0] || oldExtent[1] !== newExtent[1]) return true
      return false
    }
    
    if (Array.isArray(extent) && extent.length === 2) {
      let changed = hasChanged(extent)
      this._paletteExtent = extent
      return Promise.resolve(changed)
    }
        
    if (extent === 'subset') {
      // scan the current subset for min/max values

      // check if subsetted size is manageable
      if (this.subsetRange.shape.x * this.subsetRange.shape.y < 10000) {
        extent = rangeutil.minMax(this.subsetRange)
        let changed = hasChanged(extent)
        this._paletteExtent = extent
        return Promise.resolve(changed)
      } else {
        // subset x and y to get a fast estimate of the palette extent
        // since it is an estimate, the lower and upper bound needs a small buffer
        // (to prevent out-of-bounds colours)
        let xlen = this.subsetRange.shape.get('x')
        let ylen = this.subsetRange.shape.get('y')
        let xconstraint = {start: 0, stop: xlen, step: Math.max(Math.round(xlen/100), 1)}
        let yconstraint = {start: 0, stop: ylen, step: Math.max(Math.round(ylen/100), 1)}
        
        return this.subsetCov.subsetByIndex({x: xconstraint, y: yconstraint})        
          .then(subsetCov => {
            return subsetCov.loadRange(this.param.key).then(subsetRange => {
               let [min,max] = rangeutil.minMax(subsetRange)
               let buffer = (max-min)*0.1 // 10% buffer on each side
               extent = [min-buffer, max+buffer]
               let changed = hasChanged(extent)
               this._paletteExtent = extent
               return changed
            })
          })
      }
    } else if (extent === 'fov') {
      // scan the values that are currently in field of view on the map for min/max
      // this implies using the current subset
      let bounds = this._map.getBounds()

      // TODO implement
      throw new Error('NOT IMPLEMENTED YET')      
    } else {
      throw new Error('Unknown extent specification: ' + extent)
    }
  }
  
  set paletteExtent (extent) {
    if (this.param.observedProperty.categories) {
      throw new Error('Cannot set palette extent for categorical parameters')
    }
    this._updatePaletteExtent(extent).then(changed => {
      if (!changed) return
      this._redraw()
      this.fire('paletteExtentChange')
    })
  }
  
  get paletteExtent () {
    return this._paletteExtent
  }
  
  /**
   * Return the displayed value at a given geographic position.
   * If out of bounds, then undefined is returned, otherwise a number or null (for no data).
   */
  getValueAt (latlng) {
    if (!latlng) throw new Error('latlng parameter missing')
    // TODO see drawTile(), domain must be lat/lon for now
    let x = this.domain.axes.get('x').values
    let y = this.domain.axes.get('y').values
    let bbox = this._getDomainBbox()
    let lonRange = [bbox[0], bbox[0] + 360]
    let {lat, lon} = latlng
    
    // we first check whether the tile pixel is outside the domain bounding box
    // in that case we skip it as we do not want to extrapolate
    if (lat < bbox[1] || lat > bbox[3]) {
      return
    }

    lon = wrapLongitude(lon, lonRange)
    if (lon < bbox[0] || lon > bbox[2]) {
      return
    }

    let iLat = arrays.indexOfNearest(y, lat)
    let iLon = arrays.indexOfNearest(x, lon)

    return this.subsetRange.get({y: iLat, x: iLon})
  }
    
  drawTile (canvas, tilePoint, zoom) {
    if (this.errored) return
    
    let ctx = canvas.getContext('2d')
    let tileSize = this.options.tileSize
    
    let imgData = ctx.getImageData(0, 0, tileSize, tileSize)
    // Uint8ClampedArray, 1-dimensional, in order R,G,B,A,R,G,B,A,... row-major
    let rgba = ndarray(imgData.data, [tileSize, tileSize, 4])
    
    // projection coordinates of top left tile pixel
    let start = tilePoint.multiplyBy(tileSize)
    let startX = start.x
    let startY = start.y
    
    let palette = this.palette
    let {red, green, blue} = this.palette
    let paletteExtent = this.paletteExtent
    
    let doSetPixel = (tileY, tileX, idx) => {
      rgba.set(tileY, tileX, 0, red[idx])
      rgba.set(tileY, tileX, 1, green[idx])
      rgba.set(tileY, tileX, 2, blue[idx])
      rgba.set(tileY, tileX, 3, 255)
    }
    
    let setPixel
    if (this.param.categoryEncoding) {
      // categorical parameter with integer encoding
      let valIdxMap = this._categoryIdxMap
      let max = valIdxMap.length - 1
      setPixel = (tileY, tileX, val) => {
        if (val === null || val < 0 || val > max) return
        let idx = valIdxMap[val]
        if (idx === 255) return
        doSetPixel(tileY, tileX, idx)
      }
    } else {
      // continuous parameter
      setPixel = (tileY, tileX, val) => {
        if (val === null) return
        let idx = scale(val, palette, paletteExtent)
        doSetPixel(tileY, tileX, idx)
      }
    }
    
    let vals = this.subsetRange.get
    
    // FIXME check if "Geodetic WGS84 CRS" as term is enough to describe WGS84 angular
    //          what about cartesian??
    
    // TODO check if the domain and map CRS datum match
    // -> if not, then at least a warning should be shown
    if (this._isDomainUsingGeodeticWGS84CRS()) {
      if (this._isRectilinearGeodeticMap()) {
        // here we can apply heavy optimizations
        this._drawRectilinearGeodeticMapProjection(setPixel, tileSize, startX, startY, vals)
      } else {
        // this is for any random map projection
        // here we have to unproject each map pixel individually and find the matching domain coordinates
        this._drawAnyMapProjection(setPixel, tileSize, startX, startY, vals)
      }
    } else {
      // here we either have a projected CRS with base CRS = CRS84, or
      // a projected CRS with non-CRS84 base CRS (like British National Grid), or
      // a geodetic CRS not using a WGS84 datum
       // FIXME check this, what does geodetic CRS really mean? = lat/lon? = ellipsoid?
      
      if (this._isGeodeticTransformAvailableForDomain()) {
        throw new Error('NOT IMPLEMENTED YET')
        // TODO implement, use 2D coordinate arrays and/or proj4 transforms
      } else {
        // TODO if the map projection base CRS matches the CRS of the domain,
        //      could we still draw the grid in projected coordinates?
        // -> e.g. UK domain CRS and UK basemap in that CRS
        
        throw new Error('Cannot draw grid, spatial CRS is not geodetic ' + 
            'and no geodetic transform data is available')
      }
    }
    
    ctx.putImageData(imgData, 0, 0)    
  }
  
  /**
   * Derives the bounding box of the x,y axes in CRS coordinates.
   * @returns {Array} [xmin,ymin,xmax,ymax]
   */
  _getDomainBbox () {
    let x = this.domain.axes.get('x').values
    let y = this.domain.axes.get('y').values
    
    // TODO use bounds if they are supplied
    let xend = x.length - 1
    let yend = y.length - 1
    let [xmin,xmax] = [x[0], x[xend]]
    let [ymin,ymax] = [y[0], y[yend]]
    // TODO only enlarge when bounds haven't been used above
    if (x.length > 1) {
      xmin -= Math.abs(x[0] - x[1]) / 2
      xmax += Math.abs(x[xend] - x[xend - 1]) / 2
    }
    if (y.length > 1) {
      ymin -= Math.abs(y[0] - y[1]) / 2
      ymax += Math.abs(y[yend] - y[yend - 1]) / 2
    }
    if (xmin > xmax) {
      [xmin,xmax] = [xmax,xmin]
    }
    if (ymin > ymax) {
      [ymin,ymax] = [ymax,ymin]
    }
    return [xmin,ymin,xmax,ymax]
  }
  
  /**
   * Draws a geodetic rectilinear domain grid on a map with arbitrary projection.
   * 
   * @param {Function} setPixel A function with parameters (y,x,val) which 
   *                            sets the color of a pixel on a tile.
   * @param {Integer} tileSize Size of a tile in pixels.
   * @param {Integer} startX
   * @param {Integer} startY
   * @param {ndarray} vals Range values.
   */
  _drawAnyMapProjection (setPixel, tileSize, startX, startY, vals) {
    // usable for any map projection, but computationally more intensive
    // there are two hotspots in the loops: map.unproject and indexOfNearest

    let map = this._map
    let x = this.domain.axes.get('x').values
    let y = this.domain.axes.get('y').values
    let bbox = this._getDomainBbox()
    let lonRange = [bbox[0], bbox[0] + 360]
    
    for (let tileX = 0; tileX < tileSize; tileX++) {
      for (let tileY = 0; tileY < tileSize; tileY++) {
        let {lat,lon} = map.unproject(L.point(startX + tileX, startY + tileY))

        // we first check whether the tile pixel is outside the domain bounding box
        // in that case we skip it as we do not want to extrapolate
        if (lat < bbox[1] || lat > bbox[3]) {
          continue
        }

        lon = wrapLongitude(lon, lonRange)
        if (lon < bbox[0] || lon > bbox[2]) {
          continue
        }

        // now we find the closest grid cell using simple binary search
        // for finding the closest latitude/longitude we use a simple binary search
        // (as there is no discontinuity)
        let iLat = arrays.indexOfNearest(y, lat)
        let iLon = arrays.indexOfNearest(x, lon)

        setPixel(tileY, tileX, vals({y: iLat, x: iLon}))
      }
    }
  }
  
  /**
   * Draws a geodetic rectilinear domain grid on a map whose grid is, or can be directly
   * mapped to, a geodetic rectilinear grid.
   */
  _drawRectilinearGeodeticMapProjection (setPixel, tileSize, startX, startY, vals) {
    // optimized version for map projections that are equal to a rectilinear geodetic grid
    // this can be used when lat and lon can be computed independently for a given pixel

    let map = this._map
    let x = this.domain.axes.get('x').values
    let y = this.domain.axes.get('y').values
    let bbox = this._getDomainBbox()
    let lonRange = [bbox[0], bbox[0] + 360]
    
    var latCache = new Float64Array(tileSize)
    var iLatCache = new Uint32Array(tileSize)
    for (let tileY = 0; tileY < tileSize; tileY++) {
      var lat = map.unproject(L.point(startX, startY + tileY)).lat
      latCache[tileY] = lat
      // find the index of the closest latitude in the grid using simple binary search
      iLatCache[tileY] = arrays.indexOfNearest(y, lat)
    }

    for (let tileX = 0; tileX < tileSize; tileX++) {
      let lon = map.unproject(L.point(startX + tileX, startY)).lng
      lon = wrapLongitude(lon, lonRange)
      if (lon < bbox[0] || lon > bbox[2]) {
        continue
      }

      // find the index of the closest longitude in the grid using simple binary search
      // (as there is no discontinuity)
      let iLon = arrays.indexOfNearest(x, lon)

      for (let tileY = 0; tileY < tileSize; tileY++) {
        // get geographic coordinates of tile pixel
        let lat = latCache[tileY]

        // we first check whether the tile pixel is outside the domain bounding box
        // in that case we skip it as we do not want to extrapolate
        if (lat < bbox[1] || lat > bbox[3]) {
          continue
        }

        let iLat = iLatCache[tileY]

        setPixel(tileY, tileX, vals({y: iLat, x: iLon}))
      }
    }
  }
  
  /**
   * Return true if the map projection grid can be mapped to a rectilinear
   * geodetic grid. For that, it must satisfy:
   * for all x, there is a longitude lon, for all y, unproject(x,y).lon = lon
   * for all y, there is a latitude lat, for all x, unproject(x,y).lat = lat
   * 
   * Returns false if this is not the case or unknown.
   */
  _isRectilinearGeodeticMap () {
    let crs = this._map.options.crs
    // these are the ones included in Leaflet
    let recti = [L.CRS.EPSG3857, L.CRS.EPSG4326, L.CRS.EPSG3395, L.CRS.Simple]
    let isRecti = recti.indexOf(crs) !== -1
    // TODO for unknown ones, how do we test that?
    return isRecti
  }
  
  /**
   * Return whether the coverage domain is using a geodetic CRS with WGS84 datum.
   */
  _isDomainUsingGeodeticWGS84CRS () {
    let srs = referencingutil.getRefSystem(this.domain, ['x','y'])
    return referencingutil.isGeodeticWGS84CRS(srs)
  }
  
  _isGeodeticTransformAvailableForDomain () {
    let srs = referencingutil.getRefSystem(this.domain, ['x','y'])
    // TODO implement
    return false
  }
  
  _redraw () {
    // we check getContainer() to prevent errors when trying to redraw when the layer has not
    // fully initialized yet
    if (this.getContainer()) {
      this.redraw()
    }
  }
  
}

function wrapLongitude (lon, range) {
  return wrapNum(lon, range, true)
}

//stolen from https://github.com/Leaflet/Leaflet/blob/master/src/core/Util.js
//doesn't exist in current release (0.7.3)
function wrapNum (x, range, includeMax) {
  var max = range[1]
  var min = range[0]
  var d = max - min
  return x === max && includeMax ? x : ((x - min) % d + d) % d + min
}
