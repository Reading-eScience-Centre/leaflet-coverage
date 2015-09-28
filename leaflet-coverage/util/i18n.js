export const DEFAULT_LANGUAGE = 'en'

export function getLanguageTag (map, preferredLanguage=DEFAULT_LANGUAGE) {
  if (map.has(preferredLanguage)) {
    return preferredLanguage
  } else {
    // could be more clever here for cases like 'de' vs 'de-DE'
    return map.keys().next().value
  }
}

export function getLanguageString (map, preferredLanguage=DEFAULT_LANGUAGE) {
  if (map.has(preferredLanguage)) {
    return map.get(preferredLanguage)
  } else {
    // random language
    // this case should not happen as all labels should have common languages
    return map.values().next().value
  }
}