/**
 * Returns the first child element of parent (fall-back to document if not given)
 * matching the given selector.
 */
export function $$ (selector, parent) {
  if (typeof parent === 'string') {
    parent = $$(parent)
  }
  parent = parent || document
  return parent.querySelector(selector)
}

/**
 * Turns an HTML string into a DOM element.
 * The HTML markup must have a single root node not prepended by any whitespace.
 * 
 * @example 
 * var s = '<li>text</li>'
 * var el = HTML(s)
 * document.body.appendChild(el)
 */
export function HTML (html) {
  let div = document.createElement('div')
  div.innerHTML = html
  let element = div.firstChild
  return element
}

/**
 * Inject HTML and CSS into the DOM.
 * 
 * @param html The html to inject at the end of the body element. Must have a single root node without surrounding whitespace.
 * @param css The CSS styles to inject at the end of the head element.
 * 
 * @ignore
 */
export function inject (html, css) {
  // inject default template and CSS into DOM
  if (html) {
    document.body.appendChild(HTML(html))
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
  let node = $$('#' + id)
  // browsers without <template> support don't wrap everything in .content
  if ('content' in node) {
    node = node.content
  }
  return document.importNode(node, true).children[0]
}