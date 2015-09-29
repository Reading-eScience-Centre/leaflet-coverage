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

export default class ProfilePlot extends L.Popup {
  constructor (cov) {
    super()
    this._cov = cov
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
    let {x,y} = this._cov.domain
    this.setLatLng(L.latLng(y, x))
    let el = this._getPlotElement()
    this.setContent(el)
  }
  
  _getPlotElement () {
    var data = new google.visualization.DataTable()
    data.addColumn('number', 'Vertical')
    let paramKeys = this._cov.parameters.keys()
    for (let key of paramKeys) {
      let param = this._cov.parameters.get(key)
      // TODO add units
      data.addColumn('number', i18n.getLanguageString(param.observedProperty.label))
    }
    
    let rows = []
    for (let i=0; i < this.domain.z.length; i++) {
      let row = [this.domain.z[i]]
      for (let key of paramKeys) {
        row.push(this.ranges.get(key).get(i))
      }
    }
    data.addRows(rows)

    var options = {
      chart: {
      },
      width: 500,
      height: 700,
      orientation: 'vertical'
    }

    var el = document.createElement('div')
    var chart = new google.charts.Line(el)
    chart.draw(data, options)
    return el
  }
}
