/** @ignore */
export const DEFAULT_LANGUAGE = 'en'

/**
 * @example
 * var labels = {'en': 'Temperature', 'de': 'Temperatur'}
 * var tag = getLanguageTag(labels, 'en-GB')
 * // tag == 'en'
 * 
 * @param {object} map An object that maps language tags to strings.
 * @param {string} [preferredLanguage='en'] The preferred language as a language tag, e.g. 'de'.
 * @return {string} The best matched language tag of the input map.
 *   If no match was found then this is an arbitrary tag of the map.
 */
export function getLanguageTag (map, preferredLanguage=DEFAULT_LANGUAGE) {
  if (preferredLanguage in map) {
    return preferredLanguage
  }
  
  // cut off any subtags following the language subtag and try to find a match
  let prefTag = preferredLanguage.split('-')[0]
  let matches = Object.keys(map).filter(tag => prefTag === tag.split('-')[0])
  if (matches.length) {
    return matches[0]
  }

  // no luck, return a random tag
  return Object.keys(map)[0]
}

/**
 * @example
 * var labels = {'en': 'Temperature', 'de': 'Temperatur'}
 * var label = getLanguageString(labels, 'en-GB')
 * // label == 'Temperature'
 * 
 * @param {object} map An object that maps language tags to strings.
 * @param {string} [preferredLanguage='en'] The preferred language as a language tag, e.g. 'de'.
 * @return {string} The string within the input map whose language tag best matched.
 *   If no match was found then this is an arbitrary string of the map.
 */
export function getLanguageString (map, preferredLanguage=DEFAULT_LANGUAGE) {
  let tag = getLanguageTag(map, preferredLanguage)
  return map[tag]
}
