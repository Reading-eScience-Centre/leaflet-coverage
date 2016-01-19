export const DEFAULT_LANGUAGE = 'en'

export function getLanguageTag (map, preferredLanguage=DEFAULT_LANGUAGE) {
  if (preferredLanguage in map) {
    return preferredLanguage
  } else {
    // could be more clever here for cases like 'de' vs 'de-DE'
    return Object.keys(map)[0]
  }
}

export function getLanguageString (map, preferredLanguage=DEFAULT_LANGUAGE) {
  if (preferredLanguage in map) {
    return map[preferredLanguage]
  } else {
    // random language
    // this case should not happen as all labels should have common languages
    return map[Object.keys(map)[0]]
  }
}