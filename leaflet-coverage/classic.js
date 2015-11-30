import L from 'leaflet'

// Injects all classes etc. into leaflet's global L object.
// This is the "classic" non-ES6-module interface.

import LayerFactory from './LayerFactory.js'
import Legend from './controls/Legend.js'
import DiscreteLegend from './controls/DiscreteLegend.js'
import TimeAxis from './controls/TimeAxis.js'
import VerticalAxis from './controls/VerticalAxis.js'
import Grid from './renderers/Grid.js'
import VerticalProfile from './renderers/VerticalProfile.js'
import Trajectory from './renderers/Trajectory.js'
import * as palettes from './renderers/palettes.js'
import ParameterSync from './renderers/ParameterSync.js'
import VerticalProfilePlot from './popups/VerticalProfilePlot.js'
import * as transform from './util/transform.js'

if (!('Coverage' in L)) {
  L.coverage = {} 
}

let c = L.coverage

for (let ns of ['control', 'renderer', 'popup', 'palette']) {
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
c.renderer.Grid = Grid
c.renderer.VerticalProfile = VerticalProfile
c.renderer.Trajectory = Trajectory
c.popup.VerticalProfilePlot = VerticalProfilePlot
c.palette = palettes
c.transform = transform

