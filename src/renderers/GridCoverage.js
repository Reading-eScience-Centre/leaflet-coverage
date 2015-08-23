import L from 'leaflet'
import * as utils from 'renderers/utils'

const DOMAIN_TYPE = 'http://coveragejson.org/def#Grid'

/**
 * Renderer for Coverages with domain type Grid.
 * 
 * Provides time/vertical controls, a legend, and palette changer.
 * 
 * 
 */
class GridCoverage extends L.TileLayer.Canvas {
  
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
   *   parameter: cov.parameters.get('salinity'),
   *   time: new Date('2015-01-01T12:00:00Z'),
   *   vertical: 50
   * })
   * </code></pre>
   */
  constructor (cov, options) {
    if (cov.domainType !== DOMAIN_TYPE) {
      throw new Error('Unsupported domain type: ' + cov.domainType + ', must be: ' + DOMAIN_TYPE)
    }
    this.cov = cov
    this.param = options.parameter
    
    this._axesSubset = { // x and y are not subsetted
        t: {coordPref: options.time},
        z: {coordPref: options.vertical}
    }
  }
  
  onAdd (map) {
    this._map = map
    map.fire('dataloading') // for supporting loading spinners
    Promise.all([this.cov.loadDomain(), this.cov.loadRange(this.param.key)])
      .then([domain, range] => {
        this.domain = domain
        this.range = range
        this._subsetAxesByPreference()
        this._addControls()
        super.onAdd(map)
        map.fire('dataload')
      })
      .catch(e => {
        console.error(e.message)
        // TODO let user provide way to handle errors
        
        map.fire('dataload')
      })
  }
  
  onRemove (map) {
    this._removeControls()
    super.onRemove(map)
  }
  
  /**
   * Subsets the temporal and vertical axes based on the _axesSubset.*.coordPref property,
   * which is regarded as a preference and does not have to exactly match a coordinate.
   * 
   * After calling this method, _axesSubset.*.idx and _axesSubset.*.coord have
   * values from the actual axes.
   */
  _subsetAxesByPreference () {
    for (let axis of Object.keys(this._axesSubset)) {
      let ax = this._axesSubset[axis]
      if (ax.coordPref == undefined) { // == also handles null
        ax.idx = 0
      } else {
        ax.idx = this._getClosestIndex(axis, ax.coordPref)
      }
      ax.coord = this.domain[axis] ? this.domain[axis][ax.idx] : null
    }
  }
  
  /**
   * Subsets the temporal and vertical axes based on the _axesSubset.*.idx property
   * which has been explicitly set.
   * 
   * After calling this method, the _axesSubset.*.coord properties have
   * values from the actual axes.
   */
  _subsetAxesByIndex () {
    for (let axis of Object.keys(this._axesSubset)) {
      let ax = this._axesSubset[axis]
      ax.coord = this.domain[axis] ? this.domain[axis][ax.idx] : null
      delete ax.coordPref // in case it was set
    }
  }
  
  /**
   * Return the index of the coordinate value closest to the given value
   * within the given axis. Supports ascending and descending axes.
   * If the axis is empty, then 0 is returned, since we regard an empty axis
   * as consisting of a single "unknown" coordinate value.
   */
  _getClosestIndex (axis, val) {
    if (!(axis in this.domain)) {
      return 0
    }
    let vals = this.domain[axis]
    let idx = utils.indexOfNearest(vals, val)
    return idx
  }
  
  /**
   * Sets the currently active time to the one closest to the given Date object.
   * This has no effect if the grid has no time axis.
   */
  set time (val) {
    this._axesSubset.t.coordPref = val
    this._subsetAxesByPreference()
  }
  
  /**
   * The currently active time on the temporal axis as Date object, 
   * or null if the grid has no time axis.
   */
  get time () {
    return this._axesSubset.t.coord
  }
  
  /**
   * Sets the currently active vertical coordinate to the one closest to the given value.
   * This has no effect if the grid has no vertical axis.
   */
  set vertical (val) {
    this._axesSubset.z.coordPref = val
    this._subsetAxesByPreference()
  }
  
  /**
   * The currently active vertical coordinate as a number, 
   * or null if the grid has no vertical axis.
   */
  get vertical () {
    return this._axesSubset.z.coord
  }
  
  _addControls () {
    
  }

  _removeControls () {
    
  }
  
  drawTile (canvas, tilePoint, zoom) {
    let map = this._map
    let ctx = canvas.getContext('2d')
    let tileSize = this.options.tileSize
    
    let imgData = ctx.getImageData(0, 0, tileSize, tileSize)
    // Uint8ClampedArray, 1-dimensional, in order R,G,B,A,R,G,B,A,... row-major
    let rgba = ndarray(imgData.data, [tileSize, tileSize, 4])
    
    // projection coordinates of top left tile pixel
    let start = tilePoint.multiplyBy(tileSize)
    let startX = start.x
    let startY = start.y
    
    // TODO draw
    
    ctx.putImageData(imgData, 0, 0)    
  }
  
}