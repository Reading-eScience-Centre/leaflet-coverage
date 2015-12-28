/***
 * Return the indices of the two neighbors in the a array closest to x.
 * The array must be sorted (strictly monotone), either ascending or descending.
 * 
 * If x exists in the array, both neighbors point to x.
 * If x is lower (greated if descending) than the first value, both neighbors point to 0.
 * If x is greater (lower if descending) than the last value, both neighbors point to the last index.
 * 
 * Adapted from https://stackoverflow.com/a/4431347
 */
export function indicesOfNearest (a, x) {
  if (a.length === 0) {
    throw new Error('Array must have at least one element')
  }
  var lo = -1
  var hi = a.length
  const ascending = a.length === 1 || a[0] < a[1]
  // we have two separate code paths to help the runtime optimize the loop
  if (ascending) {
    while (hi - lo > 1) {
      let mid = Math.round((lo + hi) / 2)
      if (a[mid] <= x) {
        lo = mid
      } else {
        hi = mid
      }
    }
  } else {
    while (hi - lo > 1) {
      let mid = Math.round((lo + hi) / 2)
      if (a[mid] >= x) { // here's the difference
        lo = mid
      } else {
        hi = mid
      }
    }
  }
  if (a[lo] === x) hi = lo
  if (lo === -1) lo = hi
  if (hi === a.length) hi = lo
  return [lo, hi]
}

/**
 * Return the index in a of the value closest to x.
 * The array a must be sorted, either ascending or descending.
 * If x happens to be exactly between two values, the one that
 * appears first is returned.
 */
export function indexOfNearest (a, x) {
  var i = indicesOfNearest(a, x)
  var lo = i[0]
  var hi = i[1]
  if (Math.abs(x - a[lo]) <= Math.abs(x - a[hi])) {
    return lo
  } else {
    return hi
  }
}
