/**
 * The `change` event, signalling that a different vertical coordinate value has been selected.
 * 
 * @typedef {Object} Palette
 * @property {number} steps The number of colors in the palette.
 * @property {Array<number>} red Array of integers in [0,255] of length `steps`.
 * @property {Array<number>} green Array of integers in [0,255] of length `steps`.
 * @property {Array<number>} blue Array of integers in [0,255] of length `steps`.
 */

/**
 * Returns a linearly interpolated palette out of CSS colors.
 * 
 * @example
 * var grayscale = C.linearPalette(['#FFFFFF', '#000000'])
 * var rainbow = C.linearPalette(['#0000FF', '#00FFFF', '#00FF00', '#FFFF00', '#FF0000'])
 * 
 * @param {Array<string>} colors An array of CSS colors.
 * @param {number} [steps=256] The number of palette colors to generate.
 * @return {Palette}
 */
export function linearPalette (colors, steps=256) {
  if (steps === 1) {
    // work-around, a gradient with 1 pixel becomes black otherwise
    return directPalette([colors[0]])
  }
  // draw the gradient in a canvas
  var canvas = document.createElement('canvas')
  canvas.width = steps
  canvas.height = 1
  var ctx = canvas.getContext('2d')
  var gradient = ctx.createLinearGradient(0, 0, steps - 1, 0)
  var num = colors.length
  for (var i = 0; i < num; i++) {
    gradient.addColorStop(i / (num - 1), colors[i])
  }
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, steps, 1)

  // now read back values into arrays
  var red = new Uint8Array(steps)
  var green = new Uint8Array(steps)
  var blue = new Uint8Array(steps)

  var pix = ctx.getImageData(0, 0, steps, 1).data
  for (let i = 0, j = 0; i < pix.length; i += 4, j++) {
    red[j] = pix[i]
    green[j] = pix[i + 1]
    blue[j] = pix[i + 2]
  }

  return {
    steps: red.length,
    red: red,
    green: green,
    blue: blue
  }
}

/**
 * Converts an array of CSS colors to a palette of the same size.
 * 
 * @example
 * var bw = C.directPalette(['#000000', '#FFFFFF'])
 * // bw.steps == 2
 * 
 * @param {Array<string>} colors An array of CSS colors.
 * @return {Palette}
 */
export function directPalette (colors) {
  var canvas = document.createElement('canvas')
  canvas.width = 1
  canvas.height = 1
  var ctx = canvas.getContext('2d')
  
  var steps = colors.length
  
  var red = new Uint8Array(steps)
  var green = new Uint8Array(steps)
  var blue = new Uint8Array(steps)
  
  for (var i=0; i < colors.length; i++) {
    ctx.fillStyle = colors[i]
    ctx.fillRect(0, 0, 1, 1)
    var pix = ctx.getImageData(0, 0, 1, 1).data
    red[i] = pix[0]
    green[i] = pix[1]
    blue[i] = pix[2]
  }
  
  return {
    steps: red.length,
    red: red,
    green: green,
    blue: blue
  }
}

/**
 * Create a palette from a description object.
 * 
 * Currently, two forms are supported:
 * 
 * {
 *   "colors": ["red", "blue", ..]
 *   "interpolation": "linear",
 *   "steps": 200
 * }
 * 
 * {
 *   "colors": ["red", "blue", ..]
 * }
 * 
 * @return {Palette}
 */
export function paletteFromObject (paletteSpec) {
  if (!paletteSpec) {
    return
  }
  let colors = paletteSpec.colors
  let palette
  if (paletteSpec.interpolation === 'linear') {
    palette = linearPalette(colors, paletteSpec.steps)
  } else {
    palette = directPalette(colors)
  }
  return palette
}

/**
 * Linearly scales a value to a given palette and value extent.
 * 
 * @example
 * var value = 20
 * var grayscale = C.linearPalette(['#FFFFFF', '#000000'], 50) // 50 steps
 * var scaled = C.scale(value, grayscale, [0,100])
 * // scaled == 10
 * 
 * @param {number} val The value to scale.
 * @param {object} palette The palette onto which the value is scaled.
 * @param {Array} extent The lower and upper bound within which the value is scaled,
 *   typically the value extent of a legend.
 * @return {number} The scaled value.
 * 
 * @private
 */
export function scale (val, palette, extent) {
  // scale val to [0,paletteSize-1] using the palette extent
  // (IDL bytscl formula: http://www.exelisvis.com/docs/BYTSCL.html)
  let scaled = Math.trunc((palette.steps - 1 + 0.9999) * (val - extent[0]) / (extent[1] - extent[0]))
  return scaled
}

/**
 * Return enlarged extent if start and end are the same value,
 * otherwise return unchanged.
 * 
 * @param {Array<number>} extent The extent [min,max] to enlarge.
 * @param {number} [amount] The ratio by which to extend on each side.
 * @return {Array<number>} The enlarged extent.
 * 
 * @private
 */
export function enlargeExtentIfEqual (extent, amount=0.1) {
  if (extent[0] === extent[1]) {
    let buffer = extent[0]*amount
    return [extent[0]-buffer, extent[1]+buffer]
  } else {
    return extent
  }
}

/**
 * Manages palettes under common names.
 *  
 * @example
 * var palettes = new C.PaletteManager({defaultSteps: 10})
 * palettes.addLinear('grayscale', ['#FFFFFF', '#000000']) // 10 steps
 * palettes.addLinear('grayscalehd', ['#FFFFFF', '#000000'], {steps: 200}) // high-resolution palette
 * palettes.add('breweroranges3', ['#fee6ce', '#fdae6b', '#e6550d']) // palette of those 3 colors
 * palettes.add('mycustom', {red: [0,255], green: [0,0], blue: [10,20]}) // different syntax
 */
export class PaletteManager {
  
  /**
   * @param {Integer} defaultSteps The default number of steps when adding palettes with addLinear().
   */
  constructor({defaultSteps=256} = {}) {
    this._defaultSteps = defaultSteps
    this._palettes = new Map()
  }
  
  /**
   * Store a supplied generic palette under the given name.
   * 
   * @example
   * var palettes = new C.PaletteManager()
   * palettes.add('breweroranges3', ['#fee6ce', '#fdae6b', '#e6550d']) // palette of those 3 colors
   * palettes.add('mycustom', {red: [0,255], green: [0,0], blue: [10,20]}) // different syntax
   * 
   * @param {string} name The unique name of the palette.
   * @param {Palette|Array<string>} palette A palette object or an array of CSS colors.
   */
  add (name, palette) {
    if (Array.isArray(palette)) {
      palette = directPalette(palette)
    }
    
    if (![palette.red, palette.green, palette.blue].every(arr => arr.length === palette.red.length)) {
      throw new Error('The red, green, blue arrays of the palette must be of equal lengths')
    }
    if (!(palette.red instanceof Uint8Array)) {
      palette.red = _asUint8Array(palette.red)
      palette.green = _asUint8Array(palette.green)
      palette.blue = _asUint8Array(palette.blue)
    }
    palette.steps = palette.red.length // for convenience in clients
    this._palettes.set(name, palette)
  }
  
  /**
   * Store a linear palette under the given name created with the given CSS color specifications.
   * 
   * @example
   * var palettes = new C.PaletteManager()
   * palettes.addLinear('grayscale', ['#FFFFFF', '#000000']) // 10 steps
   * palettes.addLinear('grayscalehd', ['#FFFFFF', '#000000'], {steps: 200})
   * 
   * @param {String} name The unique name of the palette
   * @param {Array<string>} colors An array of CSS color specifications
   * @param {number} steps Use a different number of steps than the default of this manager.
   */
  addLinear (name, colors, {steps} = {}) {
    this.add(name, linearPalette(colors, steps ? steps : this._defaultSteps))
  }
  
  /**
   * Return the palette stored under the given name, or throw an error if not found.
   * The palette is an object with properties steps, red, green, and blue.
   * Each of the color arrays is an Uint8Array of length steps.
   * 
   * @param {string} name The unique name of the palette
   * @returns {Palette}
   */
  get (name) {
    var palette = this._palettes.get(name)
    if (palette === undefined) {
      throw new Error('Palette "' + name + '" not found')
    }
    return palette
  }
  
  get [Symbol.iterator] () {
    return this._palettes[Symbol.iterator]
  }
}

function _asUint8Array (arr) {
  var ta = new Uint8Array(arr.length)
  for (var i=0; i < arr.length; i++) {
    let val = arr[i]
    if (val < 0 || val > 255) {
      throw new Error('Array value must be within [0,255], but is: ' + val)
    }
    ta[i] = val
  }
  return ta
}
