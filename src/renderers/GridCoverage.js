import L from 'leaflet'

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
    this._time = options.time
    this._vertical = options.vertical
  }
  
  onAdd (map) {
    this._map = map
    map.fire('dataloading') // for supporting loading spinners
    Promise.all([this.cov.loadDomain(), this.cov.loadRange(this.param.key)])
      .then([domain, range] => {
        this.domain = domain
        this.range = range
        this._initAxes()
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
   * Sets the temporal and vertical axes indices before adding the layer to the map.
   * 
   * When
   */
  _initAxes () {
    if ('_time' in this) {
      // TODO
    } else {
      
    }
    if ('_vertical' in this) {
      
    } else {
      
    }
  }
  
  /**
   * Sets the currently active time to the one closest to the given Date object.
   * This has no effect if the grid has no time axis.
   */
  set time (val) {
    
  }
  
  /**
   * The currently active time on the temporal axis as Date object, 
   * or null if the grid has no time axis.
   */
  get time () {
    
  }
  
  /**
   * Sets the currently active vertical coordinate to the one closest to the given value.
   * This has no effect if the grid has no vertical axis.
   */
  set vertical (val) {
    
  }
  
  /**
   * The currently active vertical coordinate as a number, 
   * or null if the grid has no vertical axis.
   */
  get vertical () {
    
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