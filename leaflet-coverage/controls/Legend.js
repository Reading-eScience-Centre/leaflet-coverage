import L from 'leaflet'
import MINI from 'minified' 
let $ = MINI.$
let HTML = MINI.HTML

// TODO the default template should be moved outside this module so that it can be easily skipped
const DEFAULT_TEMPLATE_ID = 'template-coverage-parameter-legend'
const DEFAULT_TEMPLATE = `
<template id="${DEFAULT_TEMPLATE_ID}">
  <div class="info legend">
    <div style="margin-bottom:3px">
      <strong class="legend-title"></strong>
    </div>
    <div style="display: inline-block; height: 144px; float:left">
      <span style="height: 136px; width: 18px; display: block; margin-top: 9px;" class="legend-palette"></span>
    </div>
    <div style="display: inline-block; float:left; height:153px">
      <table style="height: 100%;">
        <tr><td style="vertical-align:top"><span class="legend-max"></span> <span class="legend-uom"></span></td></tr>
        <tr><td><span class="legend-current"></span></td></tr>
        <tr><td style="vertical-align:bottom"><span class="legend-min"></span> <span class="legend-uom"></span></td></tr>
      </table>
    </div>
  </div>
</template>
`
const DEFAULT_TEMPLATE_CSS = `
.legend {
  text-align: left;
  line-height: 18px;
  color: #555;
}
.legend i {
  width: 18px;
  height: 18px;
  float: left;
  margin-right: 8px;
  opacity: 0.7;
}

function injectDefaultTemplate () {
  // inject default template and CSS into DOM
  let span = document.createElement('span')
  span.innerHTML = DEFAULT_TEMPLATE
  document.body.appendChild(span.firstChild)
  
  let style = document.createElement('style')
  style.type = 'text/css'
  if (style.styleSheet){
    style.styleSheet.cssText = css
  } else {
    style.appendChild(document.createTextNode(css))
  }
  document.head.appendChild(style)
}

export default class Legend extends L.Control {
  
  constructor (covLayer, options) {
    super(options.position ? {position: options.position} : {})
    this.covLayer = covLayer
    this.id = options.id || DEFAULT_TEMPLATE_ID
    
    if (!options.id && document.getElementById(DEFAULT_TEMPLATE_ID) !== null) {
      injectDefaultTemplate()
    }

    covLayer.on('paletteChange', this.updateLegend)
    covLayer.on('paletteExtentChange', this.updateLegend)    

    covLayer.on('remove', () => {
      this.remove()
    })
  }
  
  updateLegend () {
    let el = this._el
    
    let palette = this.covLayer.palette
    let [low,high] = this.covLayer.paletteExtent
    
    $('.legend-min', el).fill(low.toFixed(2))
    $('.legend-max', el).fill(high.toFixed(2))

    let gradient = ''
    for (let i = 0; i < palette.steps; i++) {
      if (i > 0) gradient += ','
      gradient += 'rgb(' + palette.red[i] + ',' + palette.green[i] + ',' + palette.blue[i] + ')'
    }
    
    $('.legend-palette', el).set('$background',
         'transparent linear-gradient(to top, ' + gradient + ') repeat scroll 0% 0%')
  }
  
  onRemove (map) {
    covLayer.off('paletteChange', this.updateLegend)
    covLayer.off('paletteExtentChange', this.updateLegend)   
  }
  
  onAdd (map) {
    let param = this.covLayer.parameter
    let title = param.observedProperty.label
    let unit = param.unit ? (param.unit.symbol ? param.unit.symbol : param.unit.label) : ''
    
    let el = document.importNode($('#' + this.id)[0], true).firstChild
    this._el = el
    $('.legend-title', el).fill(title)
    $('.legend-uom', el).fill(unit)
    this.updateLegend()
    
    return el
  }
  
}
