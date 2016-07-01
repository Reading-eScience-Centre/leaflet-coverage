import assert from 'assert'

import L from 'leaflet'
import 'src/classic.js'

describe("classic mode", () => {
  it("should expose classes under L.coverage namespace", () => {
    assert(L.coverage)
    assert(L.coverage.LayerFactory)
    assert(L.coverage.control.Legend)
    assert(L.coverage.layer.Grid)
    assert(L.coverage.layer.MultiPolygon)
    assert(L.coverage.layer.Point)
    assert(L.coverage.layer.Trajectory)
    assert(L.coverage.layer.VerticalProfile)
    assert(L.coverage.layer.PointCollection)
    assert(L.coverage.layer.VerticalProfileCollection)
    assert(L.coverage.palette.directPalette)
  })
})