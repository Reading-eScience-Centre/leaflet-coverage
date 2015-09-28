import ndarray from 'ndarray'

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

/**
 * Wraps an object with get(i,j,k,...) method and .shape property
 * as a SciJS ndarray object (https://github.com/scijs/ndarray).
 * 
 * If the object happens to be a SciJS ndarray object already, then this function
 * just returns the same object.
 * 
 * Note that ndarray only accepts 1D-storage in its constructor, which means
 * we have to map our multi-dim indices to 1D, and get back to multi-dim
 * again afterwards.
 * TODO do benchmarks
 */
export function asSciJSndarray (arr) {
  if (['data', 'shape', 'stride', 'offset'].every(p => p in arr)) {
    // by existence of these properties we assume it is an ndarray
    return arr
  }
  var ndarr = ndarray(new Wrapper1D(arr), arr.shape)
  return ndarr
}

/**
 * Wraps an ndarray-like object with get(i,j,...) method and .shape property
 * as a 1D array object with get(i) and .length properties.
 * Instances of this class can then be used as array storage for SciJS's ndarray. 
 */
class Wrapper1D {
  constructor (arr) {
    this._arr = arr
    this._shape = arr.shape
    this._dims = arr.shape.length
    this._calculateStrides()
    this.length = arr.shape.reduce((a, b) => a * b, 1)
  }
  
  _calculateStrides () {
    var strides = new Uint16Array(this._dims)
    strides[this._dims-1] = 1
    for (var i = this._dims-2; i >= 0; i--) {
      strides[i] = strides[i+1] * this._shape[i+1]
    }
    this._strides = strides
  }
  
  get (idx) {
    // TODO add optimized versions for dim <= 4
    const dims = this._dims
    const strides = this._strides
    
    // convert 1D index to nd-indices
    var ndidx = new Array(dims)
    for (var i=0; i < dims; i++) {
      ndidx[i] = Math.trunc(idx / strides[i])
      idx -= ndidx[i] * strides[i]
    }
    return this._arr.get(...ndidx)
  }
}
