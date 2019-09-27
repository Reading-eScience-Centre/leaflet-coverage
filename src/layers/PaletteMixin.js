import {linearPalette, directPalette, paletteFromObject, scale} from './palettes.js'

const DEFAULT_CONTINUOUS_PALETTE = () => linearPalette(['#deebf7', '#3182bd']) // blues
const DEFAULT_CATEGORICAL_PALETTE = n => {
  if (n > 12) {
    throw new Error('not enough built-in categorical colors, must supply custom colors')
  }
  return directPalette(['#a6cee3','#1f78b4','#b2df8a','#33a02c','#fb9a99','#e31a1c',
                        '#fdbf6f','#ff7f00','#cab2d6','#6a3d9a','#ffff99','#b15928'].slice(0,n))
}

/**
 * The `paletteChange` event, signalling that the palette has changed.
 * 
 * @typedef {L.Event} PaletteMixin#paletteChange
 */

/**
 * The `paletteExtentChange` event, signalling that the palette extent has changed.
 * 
 * @typedef {L.Event} PaletteMixin#paletteExtentChange
 */

/**
 * A mixin that encapsulates the palette logic of a coverage layer,
 * supporting categorical and continuous coverage parameters.
 * 
 * The following functions/properties are supplied:
 * 
 * - initializePalette() - to be called once data has been loaded so that computePaletteExtent can be called
 * - get/set palette
 * - get/set paletteExtent
 * - setPaletteExtent(extent) - like set paletteExtent, but returns a Promise to know when calculations etc. are done
 * - getPaletteIndex(val) - returns the color index for the given value
 * 
 * The base class must supply the following functions/properties:
 * 
 * - options.palette (optional)
 * - options.paletteExtent (optional) - initial value that computePaletteExtent is called with
 * - parameter
 * - redraw()
 * - computePaletteExtent(extent) - returns a Promise with the computed extent; gets called when .paletteExtent is set to a string value
 * - canUsePalette() (optional) - if this method exists and returns false, then .palette returns undefined
 * 
 * @param {class} base The base class.
 * @return {class} The base class with PaletteMixin.
 */
export function PaletteMixin (base) {
  return class extends base {
    
    initializePalette () {
      let options = this.options
      let parameter = this.parameter
      if (!parameter) {
        return Promise.resolve()
      }
      let categories = parameter.observedProperty.categories
      
      if (categories) {
        this._initCategoryIdxMap()
      }
      
      if (this._palette) {
        // do nothing, already set
      } else if (options.palette) {
        this._palette = options.palette
      } else if (parameter.preferredPalette) {
        this._palette = paletteFromObject(parameter.preferredPalette)
        if (parameter.preferredPalette.extent) {
          this._paletteExtent = parameter.preferredPalette.extent
        }
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
            
      this._paletteExtent = this._paletteExtent || options.paletteExtent
      
      if (this.parameter.categoryEncoding) {
        // categorical parameter, does not depend on palette extent
        let valIdxMap = this._categoryIdxMap
        let max = valIdxMap.length - 1
        this.getPaletteIndex = val => {
          if (val === null || val < 0 || val > max) return
          let idx = valIdxMap[val]
          if (idx === 255) return
          return idx
        }
      }
      
      if (!this.canUsePalette || this.canUsePalette()) {
        return this.setPaletteExtent(this._paletteExtent, true)
          .then(() => this._updatePaletteIndexFn())
      } else {
        return Promise.resolve()
      }
    }
    
    _updatePaletteIndexFn () {
      if (!this.parameter.categoryEncoding) {
        // continuous parameter
        let palette = this.palette
        let extent = this.paletteExtent
        this.getPaletteIndex = val => {
          if (val === null) return
          let idx = scale(val, palette, extent)
          return idx
        }
      }
    }
    
    get palette () {
      if (this.parameter && (!this.canUsePalette || this.canUsePalette())) {
        return this._palette
      }
    }
    
    set palette (p) {
      this._palette = p
      this._updatePaletteIndexFn()
      this.redraw()
      this.fire('paletteChange')
    }
    
    set paletteExtent (extent) {
      this.setPaletteExtent(extent)
    }
    
    get paletteExtent () {
      return this._paletteExtent
    }
    
    setPaletteExtent (extent, skipRedraw) {
      if (this.parameter.observedProperty.categories) {
        return Promise.resolve()
      }
      
      let oldExtent = this.paletteExtent
      let hasChanged = newExtent => {
        if (!Array.isArray(oldExtent)) return true
        if (oldExtent[0] !== newExtent[0] || oldExtent[1] !== newExtent[1]) return true
        return false
      }
      let res = Array.isArray(extent) ? Promise.resolve(extent) : this.computePaletteExtent(extent)
      return res.then(newExtent => {
        // ignore invalid extents (may come from using ParameterSync)
        if (Array.isArray(newExtent) && isNaN(newExtent[0])) return
        if (!hasChanged(newExtent)) return
        this._paletteExtent = newExtent
        this._updatePaletteIndexFn()
        if (!skipRedraw) {
          this.redraw()
        }
        this.fire('paletteExtentChange')
      })
    }
            
    /**
     * Sets up a lookup table from categorical range value to palette index.
     */
    _initCategoryIdxMap () {
      let param = this.parameter
      if (!param.categoryEncoding) return
      
      // categorical parameter with integer encoding
      // Note: The palette order is equal to the categories array order.
      let max = -Infinity
      let min = Infinity
      let categories = param.observedProperty.categories
      let encoding = param.categoryEncoding
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
            for (let val of param.categoryEncoding.get(category.id)) {
              valIdxMap[val] = idx
            }
          }
        }
      } else {
        throw new Error('Too many categories: ' + categories.length)
      }
      this._categoryIdxMap = valIdxMap
    }
  }
}
