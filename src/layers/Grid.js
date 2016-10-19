import L from 'leaflet'
import ndarray from 'ndarray'
import {indexOfNearest, isDomain, fromDomain, minMaxOfRange, getReferenceObject, isEllipsoidalCRS} from 'covutils'

import {enlargeExtentIfEqual} from './palettes.js'
import PaletteMixin from './PaletteMixin.js'
import CoverageMixin from './CoverageMixin.js'
  
/**
 * Renderer for Coverages and Domains with (domain) profile Grid.
 * For Domain objects, a dummy parameter and range data is created.
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
export default class Grid extends PaletteMixin(CoverageMixin(L.GridLayer)) {
  
  /**
   * The key of the parameter to display must be given in the 'keys' options property,
   * except when the coverage data object is a Domain object.
   * 
   * Optional time and vertical axis target values can be defined with the 'time' and
   * 'vertical' options properties. The closest values on the respective axes are chosen.
   * 
   * @example
   * var cov = ... // get Coverage data
   * var layer = new C.Grid(cov, {
   *   keys: ['salinity'],
   *   time: new Date('2015-01-01T12:00:00Z'),
   *   vertical: 50,
   *   palette: C.linearPalette(['#FFFFFF', '#000000']),
   *   paletteExtent: 'full' // or 'subset' (time/vertical), 'fov' (map field of view), or specific: [-10,10]
   * })
   */
  constructor (cov, options) {
    super()
    
    if (isDomain(cov)) {
      cov = fromDomain(cov)
      options.keys = [cov.parameters.keys().next().value]
    }
    
    if (!options.paletteExtent) {
      options.paletteExtent = 'subset'
    }
    
    L.Util.setOptions(this, options)
    
    this.cov = cov
    this.param = cov.parameters.get(options.keys[0])
    this._axesSubset = { // x and y are not subsetted
        t: {coordPref: options.time ? options.time.toISOString() : undefined},
        z: {coordPref: options.vertical}
    }
  }
  
  onAdd (map) {
    // "loading" and "load" events are provided by the underlying TileLayer class
    this._map = map

    this.load()
      .then(() => this.initializePalette())
      .then(() => {
        // used in controls/VerticalAxis.js
        let vertRef = getReferenceObject(this.domain, 'z')
        if (vertRef && vertRef.coordinates.length === 1) {
          let vertRefSys = vertRef.system
          if (vertRefSys.cs && (vertRefSys.cs.csAxes || vertRefSys.cs.axes)) {
            this.crsVerticalAxis = vertRefSys.cs.csAxes ? vertRefSys.cs.csAxes[0] : vertRefSys.cs.axes[0]
          }
        } else {
          // TODO handle vertical axis part of 3D CRS
        }
      })
      .then(() => {
        this.errored = false
        super.onAdd(map)
        this.fire('dataLoad', { init: true })
      })
      .catch(e => {
        this.errored = true
        console.log(e)
        super.onAdd(map)
      })
  }
    
  onRemove (map) {
    delete this._map
    // TODO delete references to domain/range, caching logic should happen elsewhere
    super.onRemove(map)
  }
    
  getBounds () {
    let bbox
    if (this.cov.bbox) {
      bbox = this.cov.bbox
    } else {
      bbox = this._getDomainBbox()
      let proj = this.projection
      // for projected CRSs this approximates the geographic bbox by unprojecting the projected bbox corners
      // for geographic CRSs the result will be identical 
      let p1 = proj.unproject({x: bbox[0], y: bbox[1]})
      let p2 = proj.unproject({x: bbox[0], y: bbox[3]})
      let p3 = proj.unproject({x: bbox[2], y: bbox[1]})
      let p4 = proj.unproject({x: bbox[2], y: bbox[3]})
      return L.latLngBounds([p1, p2, p3, p4])
    }
    let southWest = L.latLng(bbox[1], bbox[0])
    let northEast = L.latLng(bbox[3], bbox[2])
    let bounds = L.latLngBounds(southWest, northEast)
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
  _loadCoverageSubset () {        
    let spec = {}
    for (let axis of Object.keys(this._axesSubset)) {
      let ax = this._axesSubset[axis]
      if (!this.domain.axes.has(axis)) {
        continue
      }
      if (ax.coordPref == undefined) { // == also handles null
        spec[axis] = {target: this.domain.axes.get(axis).values[0]}
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
        this.fire('dataLoad')
      })
      .catch(e => {
        this.fire('dataLoad')
        throw e
      })
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
    if (!this.domain.axes.has('t')) {
      throw new Error('No time axis found')
    }
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
    this._loadCoverageSubset().then(() => {
      if (old === this.vertical) return
      this.redraw()
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
  
  computePaletteExtent (extent) {
    if (extent === 'subset') {
      // scan the current subset for min/max values
      
      let xlen = this.subsetRange.shape.get(this._projX)
      let ylen = this.subsetRange.shape.get(this._projY)

      // check if subsetted size is manageable
      if (xlen * ylen < 1000*1000) {
        extent = minMaxOfRange(this.subsetRange)
        extent = enlargeExtentIfEqual(extent)
        return Promise.resolve(extent)
      } else {
        // subset x and y to get a fast estimate of the palette extent
        // since it is an estimate, the lower and upper bound needs a small buffer
        // (to prevent out-of-bounds colours)
        let xconstraint = {start: 0, stop: xlen, step: Math.max(Math.round(xlen/1000), 1)}
        let yconstraint = {start: 0, stop: ylen, step: Math.max(Math.round(ylen/1000), 1)}
        
        return this.subsetCov.subsetByIndex({[this._projX]: xconstraint, [this._projY]: yconstraint})        
          .then(subsetCov => {
            return subsetCov.loadRange(this.param.key).then(subsetRange => {
               let [min,max] = minMaxOfRange(subsetRange)
               let buffer = (max-min)*0.1 // 10% buffer on each side
               extent = [min-buffer, max+buffer]
               return extent
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
  
  /**
   * Return the displayed value at a given geographic position.
   * If out of bounds, then undefined is returned, otherwise a number or null (for no data).
   */
  getValueAt (latlng) {
    let X = this.domain.axes.get(this._projX).values
    let Y = this.domain.axes.get(this._projY).values
    let bbox = this._getDomainBbox()

    let {lat, lng} = latlng
    let {x,y} = this.projection.project({lat, lon: lng})

    // we first check whether the tile pixel is outside the domain bounding box
    // in that case we skip it as we do not want to extrapolate
    if (x < bbox[0] || x > bbox[2] || y < bbox[1] || y > bbox[3]) {
      return
    }
    
    let iy = indexOfNearest(Y, y)
    let ix = indexOfNearest(X, x)

    return this.subsetRange.get({[this._projY]: iy, [this._projX]: ix})
  }

  createTile (coords) {
    let tile = L.DomUtil.create('canvas', 'leaflet-tile')

    // setup tile width and height according to the options
    var size = this.getTileSize()
    tile.width = size.x
    tile.height = size.y

    this.drawTile(tile, coords)

    return tile
  }
    
  drawTile (canvas, coords) {
    if (this.errored) return
    
    let ctx = canvas.getContext('2d')
    let tileSize = this.getTileSize()
    
    let imgData = ctx.getImageData(0, 0, tileSize.x, tileSize.y)
    // Uint8ClampedArray, 1-dimensional, in order R,G,B,A,R,G,B,A,... row-major
    let rgba = ndarray(imgData.data, [tileSize.y, tileSize.x, 4])
    
    let {red, green, blue} = this.palette
        
    let getPaletteIndex = this.getPaletteIndex
    let setPixel = (tileY, tileX, val) => {
      let idx = getPaletteIndex(val)
      if (idx !== undefined) {
        rgba.set(tileY, tileX, 0, red[idx])
        rgba.set(tileY, tileX, 1, green[idx])
        rgba.set(tileY, tileX, 2, blue[idx])
        rgba.set(tileY, tileX, 3, 255)
      }
    }
    
    let vals = this.subsetRange.get
    
    if (this._isDomainUsingEllipsoidalCRS()) {
      if (this._isRectilinearGeodeticMap()) {
        // here we can apply heavy optimizations as the map CRS matches the domain CRS 
        this._drawGeodeticCRSWithRectilinearMapProjection(setPixel, coords, vals)
      } else {
        // this is for any random map projection
        // here we have to unproject each map pixel individually and find the matching domain index coordinates
        this._drawGeodeticCRSWithAnyMapProjection(setPixel, coords, vals)
      }
    } else {
      // here we have to unproject each map pixel individually, 
      // project it into domain projection coordinates, and find the domain index coordinates
      if (this._isRectilinearGeodeticMap()) {
        this._drawProjectedCRSWithRectilinearMapProjection(setPixel, coords, vals)
      } else {
        this._drawProjectedCRSWithAnyMapProjection(setPixel, coords, vals)
      }
    }
    
    ctx.putImageData(imgData, 0, 0)    
  }
  
  /**
   * Derives the bounding box of the x,y CRS axes in domain CRS coordinates.
   * @returns {Array} [xmin,ymin,xmax,ymax]
   */
  _getDomainBbox () {
    let extent = (x, xBounds) => {
      let xend = x.length - 1
      let xmin, xmax
      if (xBounds) {
        [xmin,xmax] = [xBounds.get(0)[0], xBounds.get(xend)[1]]
      } else {
        [xmin,xmax] = [x[0], x[xend]]
      }
      let xDescending = xmin > xmax
      if (xDescending) {
        [xmin,xmax] = [xmax,xmin]
      }
      if (!xBounds && x.length > 1) {
        if (xDescending) {
          xmin -= (x[xend - 1] - x[xend]) / 2
          xmax += (x[0] - x[1]) / 2
        } else {
          xmin -= (x[1] - x[0]) / 2
          xmax += (x[xend] - x[xend - 1]) / 2 
        }
      }
      return [xmin, xmax]
    }
    
    let xAxis = this.domain.axes.get(this._projX)
    let yAxis = this.domain.axes.get(this._projY)
    let [xmin, xmax] = extent(xAxis.values, xAxis.bounds)
    let [ymin, ymax] = extent(yAxis.values, yAxis.bounds)

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
  _drawGeodeticCRSWithAnyMapProjection (setPixel, coords, vals) {
    // usable for any map projection, but computationally more intensive
    // there are two hotspots in the loops: map.unproject and indexOfNearest
    
    // Note that this function is slightly more specialized and optimized than _drawProjectedCRSWithAnyMapProjection().
    // It targets the case when the domain is lat/lon, whereas _drawProjectedCRSWithAnyMapProjection() works
    // with any projected CRS in the grid domain.

    let tileSize = this.getTileSize()
    let startX = coords.x * tileSize.x
    let startY = coords.y * tileSize.y
    let zoom = coords.z

    let map = this._map
    let x = this.domain.axes.get('x').values
    let y = this.domain.axes.get('y').values
    let bbox = this._getDomainBbox()
    
    // a bit hacky
    if (this._projX === 'y') {
      bbox = [bbox[1], bbox[0], bbox[3], bbox[2]]
    }
    
    let lonRange = [bbox[0], bbox[0] + 360]

    
    
    for (let tileX = 0; tileX < tileSize.x; tileX++) {
      for (let tileY = 0; tileY < tileSize.y; tileY++) {
        let {lat,lng} = map.unproject(L.point(startX + tileX, startY + tileY), zoom)

        // we first check whether the tile pixel is outside the domain bounding box
        // in that case we skip it as we do not want to extrapolate
        if (lat < bbox[1] || lat > bbox[3]) {
          continue
        }

        lng = wrapLongitude(lng, lonRange)
        if (lng < bbox[0] || lng > bbox[2]) {
          continue
        }

        // now we find the closest grid cell using simple binary search
        // for finding the closest latitude/longitude we use a simple binary search
        // (as there is no discontinuity)
        let iLat = indexOfNearest(y, lat)
        let iLon = indexOfNearest(x, lng)

        setPixel(tileY, tileX, vals({y: iLat, x: iLon}))
      }
    }
  }
  
  /**
   * Draws a domain with projected CRS on a map with arbitrary projection.
   * 
   * @param {Function} setPixel A function with parameters (y,x,val) which 
   *                            sets the color of a pixel on a tile.
   * @param {Integer} tileSize Size of a tile in pixels.
   * @param {Integer} startX
   * @param {Integer} startY
   * @param {ndarray} vals Range values.
   */
  _drawProjectedCRSWithAnyMapProjection (setPixel, coords, vals) {
    let map = this._map
    let X = this.domain.axes.get(this._projX).values
    let Y = this.domain.axes.get(this._projY).values
    let bbox = this._getDomainBbox()
    
    let proj = this.projection

    let tileSize = this.getTileSize()
    let startX = coords.x * tileSize.x
    let startY = coords.y * tileSize.y
    let zoom = coords.z
    
    for (let tileX = 0; tileX < tileSize.x; tileX++) {
      for (let tileY = 0; tileY < tileSize.y; tileY++) {
        let {lat,lng} = map.unproject(L.point(startX + tileX, startY + tileY), zoom)
        let {x,y} = proj.project({lat, lon: lng})

        // we first check whether the tile pixel is outside the domain bounding box
        // in that case we skip it as we do not want to extrapolate
        if (x < bbox[0] || x > bbox[2] || y < bbox[1] || y > bbox[3]) {
          continue
        }

        // now we find the closest grid cell using simple binary search
        let iy = indexOfNearest(Y, y)
        let ix = indexOfNearest(X, x)

        setPixel(tileY, tileX, vals({y: iy, x: ix}))
      }
    }
  }
  
  /**
   * Draws a domain with projected CRS on a map with rectilinear lon/lat projection.
   * 
   * @param {Function} setPixel A function with parameters (y,x,val) which 
   *                            sets the color of a pixel on a tile.
   * @param {Integer} tileSize Size of a tile in pixels.
   * @param {Integer} startX
   * @param {Integer} startY
   * @param {ndarray} vals Range values.
   */
  _drawProjectedCRSWithRectilinearMapProjection (setPixel, coords, vals) {
    let map = this._map
    let X = this.domain.axes.get(this._projX).values
    let Y = this.domain.axes.get(this._projY).values
    let bbox = this._getDomainBbox()
    
    let proj = this.projection

    let tileSize = this.getTileSize()
    let startX = coords.x * tileSize.x
    let startY = coords.y * tileSize.y
    let zoom = coords.z
    
    // since the map projection is a rectilinear lat/lon grid,
    // we only have to unproject the the first row and column to get the lat/lon coordinates of all tile pixels
    let lons = new Float64Array(tileSize.x)
    for (let tileX = 0; tileX < tileSize.x; tileX++) {
      let {lng} = map.unproject(L.point(startX + tileX, startY), zoom)
      lons[tileX] = lng
    }
    let lats = new Float64Array(tileSize.y)
    for (let tileY = 0; tileY < tileSize.y; tileY++) {
      let {lat} = map.unproject(L.point(startX, startY + tileY), zoom)
      lats[tileY] = lat
    }    
    
    for (let tileX = 0; tileX < tileSize.x; tileX++) {
      for (let tileY = 0; tileY < tileSize.y; tileY++) {
        let lat = lats[tileY]
        let lon = lons[tileX]
        let {x,y} = proj.project({lat, lon})

        // we first check whether the tile pixel is outside the domain bounding box
        // in that case we skip it as we do not want to extrapolate
        if (x < bbox[0] || x > bbox[2] || y < bbox[1] || y > bbox[3]) {
          continue
        }

        // now we find the closest grid cell using simple binary search
        let iy = indexOfNearest(Y, y)
        let ix = indexOfNearest(X, x)

        setPixel(tileY, tileX, vals({y: iy, x: ix}))
      }
    }
  }
  
  /**
   * Draws a geodetic rectilinear domain grid on a map whose grid is, or can be directly
   * mapped to, a geodetic rectilinear grid.
   */
  _drawGeodeticCRSWithRectilinearMapProjection (setPixel, coords, vals) {
    // optimized version for map projections that are equal to a rectilinear geodetic grid
    // this can be used when lat and lon can be computed independently for a given pixel

    let map = this._map
    let x = this.domain.axes.get('x').values
    let y = this.domain.axes.get('y').values
    let bbox = this._getDomainBbox()
    
    // a bit hacky
    if (this._projX === 'y') {
      bbox = [bbox[1], bbox[0], bbox[3], bbox[2]]
    }
      
    let lonRange = [bbox[0], bbox[0] + 360]

    let tileSize = this.getTileSize()
    let startX = coords.x * tileSize.x
    let startY = coords.y * tileSize.y
    let zoom = coords.z
    
    var latCache = new Float64Array(tileSize.y)
    var iLatCache = new Uint32Array(tileSize.y)
    for (let tileY = 0; tileY < tileSize.y; tileY++) {
      var lat = map.unproject(L.point(startX, startY + tileY), zoom).lat
      latCache[tileY] = lat
      // find the index of the closest latitude in the grid using simple binary search
      iLatCache[tileY] = indexOfNearest(y, lat)
    }

    for (let tileX = 0; tileX < tileSize.x; tileX++) {
      let lon = map.unproject(L.point(startX + tileX, startY), zoom).lng
      lon = wrapLongitude(lon, lonRange)
      if (lon < bbox[0] || lon > bbox[2]) {
        continue
      }

      // find the index of the closest longitude in the grid using simple binary search
      // (as there is no discontinuity)
      let iLon = indexOfNearest(x, lon)

      for (let tileY = 0; tileY < tileSize.y; tileY++) {
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
  _isDomainUsingEllipsoidalCRS () {
    return this.domain.referencing.some(ref => isEllipsoidalCRS(ref.system))
  }
      
  redraw () {
    // we check getContainer() to prevent errors when trying to redraw when the layer has not
    // fully initialized yet
    if (this.getContainer()) {
      L.GridLayer.prototype.redraw.call(this)
    }
  }
}

function wrapLongitude (lon, range) {
  return L.Util.wrapNum(lon, range, true)
}
