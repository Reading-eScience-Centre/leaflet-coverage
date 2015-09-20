import assert from 'assert'

import L from 'leaflet'
import 'leaflet-coverage/classic.js'

describe("classic mode", () => {
  it("should expose classes under L.coverage namespace", () => {
    assert(L.coverage)
    assert(L.coverage.LayerFactory)
    assert(L.coverage.control.Legend)
    assert(L.coverage.renderer.Grid)
    assert(L.coverage.palette.directPalette)
  })
})