import L from 'leaflet'
import c3 from 'c3'

import * as i18n from '../util/i18n.js'

// not used currently
const DEFAULT_PLOT_OPTIONS = {}

export default class ProfilePlot extends L.Popup {
  constructor (cov, options, plotOptions) {
    super()
    this._cov = cov
    this.param = options.keys ? cov.parameters.get(options.keys[0]) : null
    this.plotOptions = plotOptions || DEFAULT_PLOT_OPTIONS
    
    if (this.param === null) {
      throw new Error('multiple params not supported yet')
    }
  }
  
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
    let {x,y} = this.domain
    this.setLatLng(L.latLng(y, x))
    let el = this._getPlotElement()
    this.setContent(el)
  }
  
  _getPlotElement () {
    let param = this.param
    
    let xLabel = 'Vertical'
    let x = ['x']
    for (let z of this.domain.z) {
      x.push(z)
    }
    let y = [this._cov.id]
    for (let i=0; i < this.domain.z.length; i++) {
      y.push(this.ranges.get(param.key).values.get(i))
    }

    let el = document.createElement('div')
    c3.generate({
      bindto: el,
      data: {
        x: 'x',
        columns: [x, y]
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
            // TODO add units
            text: i18n.getLanguageString(param.observedProperty.label),
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
      size: {
        height: 300,
        width: 300
      },
    })
    
    return el
  }
}
