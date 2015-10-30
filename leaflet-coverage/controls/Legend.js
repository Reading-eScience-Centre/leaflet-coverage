import DiscreteLegend from './DiscreteLegend.js'
import ContinuousLegend from './ContinuousLegend.js'

export default function (layer, options) {
  if (layer.parameter.categories) {
    return new DiscreteLegend(layer, options)
  } else {
    return new ContinuousLegend(layer, options)
  }
}