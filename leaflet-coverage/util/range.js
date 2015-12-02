/**
 * Return the minimum/maximum across all range values,
 * ignoring null's.
 */
export function minMax (range) {
  let min = Infinity
  let max = -Infinity
  let fn = val => {
    if (val === null) return
    if (val < min) min = val
    if (val > max) max = val
  }
  iterate(range, fn)
  return [min, max]
}

/**
 * Apply a reduce function over the range values.
 */
export function reduce (range, fn, start) {
  let v1 = start
  let iterFn = v2 => {
    v1 = fn(v1, v2)
  }
  iterate(range, iterFn)
  return v1
}

/**
 * Iterate over all range values and run a function for each value.
 * No particular iteration order must be assumed.
 */
export function iterate (range, fn) {
  // We use a precompiled function here for efficiency.
  // See below for a slower recursive version.

  // Benchmarks compared to recursive version:
  // Chrome 46: around 1.03x faster
  // Firefox 42: around 2x faster (and around 6x faster than Chrome 46!)
  
  // nest loops from smallest to biggest
  let shape = [...range.shape]
  shape.sort(([,size1], [,size2]) => size1 - size2)
  
  let begin = 'var obj = {}'
  let end = ''
  for (let [axis,size] of shape) {
    begin += `
      for (var i${axis}=0; i${axis} < ${size}; ++i${axis}) {
        obj['${axis}'] = i${axis}
    `
    end += `}`
  }
  begin += `
    fn(get(obj))
  `
  
  let iterateLoop = new Function('get', 'fn', begin + end)
  iterateLoop(range.get, fn)
}

/*
 * Recursive version of iterate(). For reference only.
 * 
export function iterate (range, fn) {
  let get = range.get
  let shape = [...range.shape]
  // iterate from smallest to biggest dimension
  shape.sort(([,size1], [,size2]) => size1 - size2)
  let dims = shape.length
  
  function iterateRecurse (obj, axisIdx) {
    if (dims === axisIdx) {
      fn(get(obj))
    } else {
      let [axis,size] = shape[axisIdx]
      for (let i=0; i < size; i++) {
        obj[axis] = i
        iterateRecurse(obj, axisIdx+1)
      }
    }
  }
  iterateRecurse({}, 0)
}
*/
