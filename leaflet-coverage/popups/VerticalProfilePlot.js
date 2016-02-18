import L from 'leaflet'
import c3 from 'c3'
import 'c3/c3.css!'

import * as i18n from '../util/i18n.js'
import * as referencingUtil from '../util/referencing.js'

/**
 * Displays a popup with an interactive plot showing the measurements
 * of the vertical profile coverage.
 */
export default class VerticalProfilePlot extends L.Popup {
  
  // 
  
  /**
   * Creates a vertical profile plot popup.
   * 
   * @param {object} coverage The vertical profile coverage to visualize.
   * @param {object} [options] Popup options.
   * @param {array} [options.keys] A single-element array of a parameter key
   * @param {string} [options.language] A language tag, indicating the preferred language to use for labels.
   */
  constructor (coverage, options) {
    super({maxWidth: 350})
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
        this.domain = domain
        this.ranges = ranges
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
    let x = this.domain.axes.get('x')
    let y = this.domain.axes.get('y')
    this.setLatLng(L.latLng(y.values[0], x.values[0]))
    let el = this._getPlotElement()
    this.setContent(el)
  }
  
  _getPlotElement () {
    let param = this._param
    
    let zName = 'Vertical'
    let zUnit = ''
      
    let vertSrs = referencingUtil.getRefSystem(this.domain, ['z'])
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
    for (let z of this.domain.axes.get('z').values) {
      x.push(z)
    }
    let y = [param.key]
    for (let i=0; i < this.domain.axes.get('z').values.length; i++) {
      y.push(this.ranges.get(param.key).get({z: i}))
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
