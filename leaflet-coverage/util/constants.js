const COVJSON_PREFIX = 'http://coveragejson.org/def#'
export const COVJSON_VERTICALPROFILE = COVJSON_PREFIX + 'VerticalProfile'
export const COVJSON_VERTICALPROFILECOLLECTION = COVJSON_VERTICALPROFILE + 'CoverageCollection'
export const COVJSON_GRID = COVJSON_PREFIX + 'Grid'
export const COVJSON_TRAJECTORY = COVJSON_PREFIX + 'Trajectory'
export const COVJSON_MULTIPOLYGON = COVJSON_PREFIX + 'MultiPolygon'

/**
 * Checks whether profile is included in the given profiles.
 */
export function checkProfile (profiles, profile) {
  if (profiles.indexOf(profile) === -1) {
    throw new Error('Unsupported domain profiles: ' + profiles + ', must contain: ' + profile)
  }
}