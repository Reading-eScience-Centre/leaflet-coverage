import PointCollection from './PointCollection.js'
import VerticalProfile from './VerticalProfile.js'


// We implement this specifically for vertical profiles for now and see what we can move into
// a common class later.

/**
 * A collection of vertical profiles sharing the same parameters / referencing.
 * 
 */
export default class VerticalProfileCollection extends PointCollection {
  constructor (covcoll, options) {
    super(covcoll, options)
    
    // set some options for PointCollection
    this.pointClass = VerticalProfile
    this.pointOptionsFn = () => ({
      vertical: this._vertical
    })
    
    this._vertical = options.vertical
  }
    
  set vertical (val) {
    this._vertical = val
    for (let layer of this._layers) {
      layer.vertical = val
    }
  }
  
  // overrides PointCollection.palette
  get palette () {
    return this.param && this._vertical !== undefined ? this._palette : undefined
  }
}
