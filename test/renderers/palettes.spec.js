import assert from 'assert'

import * as palettes from 'leaflet-coverage/renderers/palettes.js'

describe('renderers/palettes', () => {
  describe('#directPalette', () => {
    it('returns an identical palette', () => {
      let r = [100,23,10]
      let g = [13,50,123]
      let b = [10,99,255]
      let colors = []
      for (let i=0; i < r.length; i++) {
        colors.push(`rgb(${r[i]}, ${g[i]}, ${b[i]})`)
      }
      let palette = palettes.directPalette(colors)
      for (let i=0; i < r.length; i++) {
        assert.strictEqual(palette.red[i], r[i])
        assert.strictEqual(palette.green[i], g[i])
        assert.strictEqual(palette.blue[i], b[i])
      }
    })
  })
  describe('#PaletteManager', () => {
    describe('#addLinear', () => {
      let steps = 10
      let pm = new palettes.PaletteManager({defaultSteps: steps})
      pm.addLinear('blues', ['#deebf7', '#3182bd'])
      let blues = pm.get('blues')
      assert.equal(blues.steps, steps)
      assert.equal(blues.red.length, steps)
      assert.equal(blues.green.length, steps)
      assert.equal(blues.blue.length, steps)
    })
  })
})