/**
 * Calculates a linear palette of the given size (default 256) from the given
 * CSS color specifications.
 * 
 * Example:
 * <pre><code>
 * var grayscale = linearPalette(['#FFFFFF', '#000000'], 10) // 10-step palette
 * var rainbow = linearPalette(['#0000FF', '#00FFFF', '#00FF00', '#FFFF00', '#FF0000'])
 * </code></pre>
 * 
 * @param {Array} colors An array of CSS color specifications
 * @param {number} steps The number of palette colors to calculate
 * @return An object with members ncolors, red, green, blue, usable with
 *         the PaletteManager class.
 */
export function linearPalette (colors, steps=256) {
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
    red: red,
    green: green,
    blue: blue
  }
}

/**
 * Converts an array of CSS colors to a palette of the same size.
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
    red: red,
    green: green,
    blue: blue
  }
}

export function scale (val, palette, extent) {
  // scale val to [0,paletteSize-1] using the palette extent
  // (IDL bytscl formula: http://www.exelisvis.com/docs/BYTSCL.html)
  let scaled = Math.trunc((palette.steps - 1 + 0.9999) * (val - extent[0]) / (extent[1] - extent[0]))
  return scaled
}

/**
 * Manages palettes under common names.
 * 
 * Palettes can have different numbers of steps.
 * Linear palettes can be conveniently added by supplying an array of CSS color specifications.
 * Generic palettes can be added by directly supplying the step colors as RGB arrays. 
 * 
 * Example:
 * <pre><code>
 * var palettes = new PaletteManager({defaultSteps: 10})
 * palettes.addLinear('grayscale', ['#FFFFFF', '#000000']) // has 10 steps
 * palettes.addLinear('grayscalehd', ['#FFFFFF', '#000000'], {steps=1000}) // high-resolution palette
 * palettes.add('breweroranges3', ['#fee6ce', '#fdae6b', '#e6550d']) // palette of exactly those 3 colors
 * palettes.add('mycustom', {red: [0,255], green: [0,0], blue: [10,20]}) // different syntax
 * </code></pre>
 * 
 * Note that Uint8Array typed arrays should be used for custom palettes (added via add()) to avoid
 * internal transformation.
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
   * @param name The unique name of the palette.
   * @param palette An object with red, green, and blue properties (each an array of [0,255] values),
   *                or an array of CSS color specifications.
   */
  add (name, palette) {
    if (this._palettes.has(name)) {
      console.warn('A palette with name "' + name + '" already exists! Overwriting...')
    }
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
   * @param {String} name The unique name of the palette
   * @param {Array} colors An array of CSS color specifications
   * @param {Integer} steps Use a different number of steps than the default of this manager.
   */
  addLinear (name, colors, {steps} = {}) {
    this.add(name, linearPalette(colors, steps ? steps : this._defaultSteps))
  }
  
  /**
   * Return the palette stored under the given name, or throws an error if not found.
   * The palette is an object with properties steps, red, green, and blue.
   * Each of the color arrays is an Uint8Array of length steps.
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
