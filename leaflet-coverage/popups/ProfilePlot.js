import L from 'leaflet'
import c3 from 'c3'
import 'c3/c3.css!'

import * as i18n from '../util/i18n.js'

// not used currently
const DEFAULT_PLOT_OPTIONS = {}

export default class ProfilePlot extends L.Popup {
  constructor (cov, options, plotOptions) {
    super({maxWidth: 350})
    this._cov = cov
    this.param = options.keys ? cov.parameters.get(options.keys[0]) : null
    this.language = options.language || i18n.DEFAULT_LANGUAGE
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
    let unit = param.unit ? 
               (param.unit.symbol ? param.unit.symbol : i18n.getLanguageString(param.unit.label, this.language)) :
               ''
    let obsPropLabel = i18n.getLanguageString(param.observedProperty.label, this.language) 
    let x = ['x']
    for (let z of this.domain.z) {
      x.push(z)
    }
    let y = [param.key]
    for (let i=0; i < this.domain.z.length; i++) {
      y.push(this.ranges.get(param.key).values.get(i))
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
          title: d => 'Vertical: ' + d,
          value: (value, ratio, id) => value + unit
        }
      },
      zoom: {
        enabled: true,
        rescale: true
      },
      size: {
        height: 300,
        width: 350
      },
    })
    
    return el
  }
}
