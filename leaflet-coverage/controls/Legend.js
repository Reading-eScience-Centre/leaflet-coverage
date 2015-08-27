import L from 'leaflet'

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
`

export default class Legend extends L.Control {
  
  constructor (covLayer, options) {
    super(options.position ? {position: options.position} : {})
    this.covLayer = covLayer
    this.id = options.id || DEFAULT_TEMPLATE_ID
    
    if (!options.id && document.getElementById(DEFAULT_TEMPLATE_ID) !== null) {
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
    
    // remove control from map when covLayer is removed
    covLayer.on('remove', () => {
      this.remove()
    })
  }
  
  onAdd (map) {
    let palette = this.covLayer.palette
    let el = document.importNode(document.getElementById(this.id), true).firstChild
    el.getElementsByClassName('legend-title')[0].innerHTML = title
    el.getElementsByClassName('legend-uom')[0].innerHTML = uom
    el.getElementsByClassName('.legend-min')[0].innerHTML = low
    el.getElementsByClassName('.legend-max')[0].innerHTML = high

    var gradient = ''
    for (var i = 0; i < palette.steps; i++) {
      if (i > 0) gradient += ','
      gradient += 'rgb(' + palette.red[i] + ',' + palette.green[i] + ',' + palette.blue[i] + ')'
    }
    // TODO adapt
    $('.legend-palette', div).css('background',
         'transparent linear-gradient(to top, ' + gradient + ') repeat scroll 0% 0%')
    return div
  }
  
  onRemove (map) {
    // clear event listeners
  }
  
}
