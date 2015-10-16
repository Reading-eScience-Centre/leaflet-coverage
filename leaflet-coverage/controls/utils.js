/**
 * Inject HTML and CSS into the DOM.
 * 
 * @param html The html to inject at the end of the body element.
 * @param css The CSS styles to inject at the end of the head element.
 */
export function inject (html, css) {
  // inject default template and CSS into DOM
  if (html) {
    let span = document.createElement('span')
    span.innerHTML = html
    document.body.appendChild(span.children[0])
  }
  
  if (css) {
    let style = document.createElement('style')
    style.type = 'text/css'
    if (style.styleSheet){
      style.styleSheet.cssText = css
    } else {
      style.appendChild(document.createTextNode(css))
    }
    document.head.appendChild(style)
  }
}