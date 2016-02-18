import DiscreteLegend from './DiscreteLegend.js'
import ContinuousLegend from './ContinuousLegend.js'

/**
 * Convenience function that returns a legend control
 * based on the coverage parameter type.
 * For categorical parameters this returns a {@link DiscreteLegend},
 * otherwise a {@link ContinuousLegend} instance.
 * 
 * Note that custom HTML templates cannot be used with this function.
 * If this is necessary, consider using the individual legend classes
 * instead. 
 * 
 * @example <caption>Coverage data layer</caption>
 * var legend = Legend(covLayer).addTo(map)
 * 
 * @example <caption>Fake layer</caption>
 * // see DiscreteLegend and ContinuousLegend docs
 * 
 * @example <caption>Non-module access</caption>
 * L.coverage.control.Legend
 * 
 * @param {object} covLayer The coverage data layer.
 * @param {object} [options] Legend options.
 * @param {string} [options.position] The initial position of the control (see Leaflet docs).
 * @param {string} [options.language] A language tag, indicating the preferred language to use for labels.
 * @return {DiscreteLegend|ContinuousLegend}
 */
export default function (layer, options) {
  if (layer.parameter.observedProperty.categories) {
    return new DiscreteLegend(layer, options)
  } else {
    return new ContinuousLegend(layer, options)
  }
}
