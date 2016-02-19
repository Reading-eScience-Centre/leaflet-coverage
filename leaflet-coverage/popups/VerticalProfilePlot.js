import L from 'leaflet'
import c3 from 'c3'
import 'c3/c3.css!'

import * as i18n from '../util/i18n.js'
import * as referencingUtil from '../util/referencing.js'

/**
 * Displays a popup with an interactive plot showing the data
 * of the vertical profile coverage.
 * 
 * @example
 * layer.bindPopup(new VerticalProfilePlot(coverage))
 * 
 * @example <caption>Non-module access</caption>
 * L.coverage.popup.VerticalProfilePlot
 */
export default class VerticalProfilePlot extends L.Popup {
  
  // TODO rethink options.keys, feels weird
  
  /**
   * Creates a vertical profile plot popup.
   * 
   * @param {object} coverage The vertical profile coverage to visualize.
   * @param {object} [options] Popup options. See also http://leafletjs.com/reference.html#popup-options.
   * @param {Array} [options.keys] A single-element array of a parameter key
   * @param {string} [options.language] A language tag, indicating the preferred language to use for labels.
   */
  constructor (coverage, options = {}) {
    options.maxWidth = options.maxWidth || 350
    super(options)
    this._cov = coverage
    this._param = options.keys ? coverage.parameters.get(options.keys[0]) : null
    this._language = options.language || i18n.DEFAULT_LANGUAGE
    
    if (this._param === null) {
      throw new Error('multiple params not supported yet')
    }
  }
  
  /**
   * @ignore
   */
  onAdd (map) {
    map.fire('dataloading')
    Promise.all([this._cov.loadDomain(), this._cov.loadRanges()])
      .then(([domain, ranges]) => {
        this._domain = domain
        this._ranges = ranges
        this._addPlotToPopup()
        super.onAdd(map)
        this.fire('add')
        map.fire('dataload')
      }).catch(e => {
        console.error(e)
        this.fire('error', e)      
        map.fire('dataload')
      })
  }
  
  _addPlotToPopup () {
    // TODO transform if necessary
    if (!this.getLatLng()) {
      // in case bindPopup is not used and the caller did not set a position
      let x = this._domain.axes.get('x')
      let y = this._domain.axes.get('y')
      this.setLatLng(L.latLng(y.values[0], x.values[0]))
    }
    let el = this._getPlotElement()
    this.setContent(el)
  }
  
  _getPlotElement () {
    let param = this._param
    
    let zName = 'Vertical'
    let zUnit = ''
      
    let vertSrs = referencingUtil.getRefSystem(this._domain, ['z'])
    if (vertSrs) {
      if (vertSrs.cs && vertSrs.cs.axes) {
        let ax = vertSrs.cs.axes[0]
        zUnit = ax.unit.symbol
        // TODO i18n
        if (ax.name && ax.name.en) {
          zName = ax.name.en
        }
      }
    }
    
    let xLabel = zName
    if (zUnit) {
      xLabel += ' (' + zUnit + ')'
    }
    
    let unit = param.unit ? 
               (param.unit.symbol ? param.unit.symbol : i18n.getLanguageString(param.unit.label, this._language)) :
               ''
    let obsPropLabel = i18n.getLanguageString(param.observedProperty.label, this._language) 
    let x = ['x']
    for (let z of this._domain.axes.get('z').values) {
      x.push(z)
    }
    let y = [param.key]
    for (let i=0; i < this._domain.axes.get('z').values.length; i++) {
      y.push(this._ranges.get(param.key).get({z: i}))
    }

    let el = document.createElement('div')
    c3.generate({
      bindto: el,
      data: {
        x: 'x',
        columns: [x, y],
        names: {
          [param.key]: obsPropLabel
        }
      },
      axis: {
        rotated: true,
        x: {
          label: {
            text: xLabel,
            position: 'outer-center'
          }
        },
        y: {
          label: {
            text: obsPropLabel + (unit ? ' (' + unit + ')' : ''),
            position: 'outer-middle'
          }
        }
      },
      grid: {
        x: {
            show: true
        },
        y: {
            show: true
        }
      },
      // no need for a legend since there is only one source currently
      legend: {
        show: false
      },
      tooltip: {
        format: {
          title: d => zName + ': ' + d + ' ' + zUnit,
          value: (value, ratio, id) => value + ' ' + unit
        }
      },
      zoom: {
        enabled: true,
        rescale: true
      },
      size: {
        height: 300,
        width: 350
      }
    })
    
    return el
  }
}
