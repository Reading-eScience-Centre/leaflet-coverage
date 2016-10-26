import {PointCollection} from './PointCollection.js'
import {VerticalProfile} from './VerticalProfile.js'

/**
 * A collection of vertical profiles sharing the same parameters and coordinate referencing system.
 * 
 * @see https://covjson.org/domain-types/#verticalprofile
 * 
 * @emits {DataLayer#afterAdd} Layer is initialized and was added to the map
 * @emits {DataLayer#error} Error when loading data
 * @emits {PaletteMixin#paletteChange} Palette has changed
 * @emits {PaletteMixin#paletteExtentChange} Palette extent has changed
 * @emits {Point#click} when the point was clicked
 */
export class VerticalProfileCollection extends PointCollection {

  /**
   * @param {CoverageCollection} covcoll The coverage collection to visualize.
   * @param {Object} [options] The options object.
   * @param {string} [options.parameter] The key of the parameter to display.
   * @param {Palette} [options.palette] The initial color palette to use, the default depends on the parameter type.
   * @param {string} [options.paletteExtent='full'] The initial palette extent, either 'full', 'fov', or specific: [-10,10].
   * @param {string} [options.defaultColor='black'] The color to use for missing data or if no parameter is set.  
   */
  constructor (covcoll, options) {
    options.pointClass = VerticalProfile
    options.pointOptionsFn = () => ({
      vertical: this._vertical
    })
    super(covcoll, options)
    
    this._vertical = options.vertical
  }
  
  /**
   * Sets the currently active vertical coordinate for all vertical profiles to the one closest to the given value.
   * 
   * @type {number|undefined}
   */
  set vertical (val) {
    this._vertical = val
    for (let layer of this._layers) {
      layer.vertical = val
    }
  }
  
  /**
   * See {@link PaletteMixin}.
   * 
   * @ignore
   */
  canUsePalette () {
    return this._vertical !== undefined
  }
}
