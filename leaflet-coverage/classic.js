import L from 'leaflet'

// Injects all classes etc. into leaflet's global L object.
// This is the "classic" non-ES6-module interface.

import LayerFactory from './LayerFactory.js'

import Legend from './controls/Legend.js'
import DiscreteLegend from './controls/DiscreteLegend.js'
import TimeAxis from './controls/TimeAxis.js'
import VerticalAxis from './controls/VerticalAxis.js'

import Grid from './layers/Grid.js'
import VerticalProfile from './layers/VerticalProfile.js'
import Trajectory from './layers/Trajectory.js'
import Point from './layers/Point.js'
import MultiPolygon from './layers/MultiPolygon.js'
import PointCollection from './layers/PointCollection.js'
import VerticalProfileCollection from './layers/VerticalProfileCollection.js'

import * as palettes from './layers/palettes.js'
import ParameterSync from './layers/ParameterSync.js'

import VerticalProfilePlot from './popups/VerticalProfilePlot.js'

import * as transform from './util/transform.js'

if (!('Coverage' in L)) {
  L.coverage = {} 
}

let c = L.coverage

for (let ns of ['control', 'layer', 'popup', 'palette']) {
  if (!(ns in c)) {
    c[ns] = {}
  }
}

c.LayerFactory = LayerFactory
c.ParameterSync = ParameterSync
c.control.Legend = Legend
c.control.DiscreteLegend = DiscreteLegend
c.control.TimeAxis = TimeAxis
c.control.VerticalAxis = VerticalAxis
c.layer.Grid = Grid
c.layer.VerticalProfile = VerticalProfile
c.layer.Trajectory = Trajectory
c.layer.Point = Point
c.layer.MultiPolygon = MultiPolygon
c.layer.PointCollection = PointCollection
c.layer.VerticalProfileCollection = VerticalProfileCollection
c.popup.VerticalProfilePlot = VerticalProfilePlot
c.palette = palettes
c.transform = transform

