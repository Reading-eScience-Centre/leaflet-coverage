import {$, HTML} from 'minified'

/**
 * Inject HTML and CSS into the DOM.
 * 
 * @param html The html to inject at the end of the body element.
 * @param css The CSS styles to inject at the end of the head element.
 * 
 * @ignore
 */
export function inject (html, css) {
  // inject default template and CSS into DOM
  if (html) {
    $('body').add(HTML(html))
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

/**
 * @ignore
 */
export function fromTemplate (id) {
  let node = $('#' + id)[0]
  // browsers without <template> support don't wrap everything in .content
  if ('content' in node) {
    node = node.content
  }
  return document.importNode(node, true).children[0]
}