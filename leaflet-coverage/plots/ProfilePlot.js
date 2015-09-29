import L from 'leaflet'

// cannot import directly here as CORS headers are missing!
//import 'https://www.google.com/jsapi'

import * as i18n from '../util/i18n.js'

let googleReady = new Promise((resolve, reject) => {
  google.load('visualization', '1.1', {
    packages: ['line'], 
    callback: resolve
  })
})

const DEFAULT_PLOT_OPTIONS = {
  width: 500,
  height: 500,
  axes: {
    x: {
      0: {format: '#,##'}
    }
  },
  orientation: 'vertical'
}

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
    Promise.all([this._cov.loadDomain(), this._cov.loadRanges(), googleReady])
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
    let data = new google.visualization.DataTable()
    data.addColumn('number', 'Vertical')
    data.addColumn('number', this._cov.id)
    
    let rows = []
    for (let i=0; i < this.domain.z.length; i++) {
      let row = [this.domain.z[i],
                 this.ranges.get(param.key).values.get(i)]
      rows.push(row)
    }
    data.addRows(rows)

    var el = document.createElement('div')
    var chart = new google.charts.Line(el)
    
    let opts = this.plotOptions
    // TODO add units
    opts.axes.x[0].label = i18n.getLanguageString(param.observedProperty.label)
    
    chart.draw(data, this.plotOptions)
    return el
  }
}
