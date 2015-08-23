/***
 * Return the indices of the two neighbors in the a array closest to x.
 * The array must be sorted, either ascending or descending.
 * 
 * If x exists in the array, both neighbors point to x.
 * If x is lower (greated if descending) than the first value, both neighbors point to 0.
 * If x is greater (lower if descending) than the last value, both neighbors point to the last index.
 * 
 * Adapted from https://stackoverflow.com/a/4431347
 */
export function indicesOfNearest (a, x) {
  // TODO handle descending arrays
  var lo = -1
  var hi = a.length
  while (hi - lo > 1) {
    let mid = Math.round((lo + hi) / 2)
    if (a[mid] <= x) {
      lo = mid
    } else {
      hi = mid
    }
  }
  if (a[lo] === x) hi = lo
  if (lo === -1) lo = hi
  if (hi === a.length) hi = lo
  return [lo, hi]
}

export function indexOfNearest (a, x) {
  var i = indicesOfNearest(a, x)
  var lo = i[0]
  var hi = i[1]
  if (Math.abs(x - a[lo]) < Math.abs(x - a[hi])) {
    return lo
  } else {
    return hi
  }
}