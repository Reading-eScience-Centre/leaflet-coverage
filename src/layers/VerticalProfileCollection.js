import {PointCollection} from './PointCollection.js'
import {VerticalProfile} from './VerticalProfile.js'

/**
 * A collection of vertical profiles sharing the same parameters / referencing.
 * 
 */
export class VerticalProfileCollection extends PointCollection {
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
  
  canUsePalette () {
    return this._vertical !== undefined
  }
}
