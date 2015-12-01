/**
 * Iterate over all range values and run a function for each value.
 */
export function iterate (range, fn) {
  // TODO create pre-compiled for-loop version to improve speed
  function iterateRecurse (obj, shape, axisIdx) {
    if (shape.length === axisIdx) {
      let val = range.get(obj)
      fn(val, obj)
    } else {
      let [axis,size] = shape[axisIdx]
      for (let i=0; i < size; i++) {
        obj[axis] = i
        iterateRecurse(obj, shape, axisIdx+1)
      }
    }
  }
  let shape = [...range.shape]
  return iterateRecurse({}, shape, 0)
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
