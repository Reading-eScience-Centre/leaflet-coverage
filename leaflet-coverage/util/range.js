/**
 * Apply a reduce function over the range values.
 */
export function reduce (range, fn, start) {
  function it (obj, shape, axisIdx, v1) {
    if (shape.length === axisIdx) {
      let v2 = range.get(obj)
      return fn(v1, v2)
    } else {
      let [axis,size] = shape[axisIdx]
      for (let i=0; i < size; i++) {
        obj[axis] = i
        v1 = it(obj, shape, axisIdx+1, v1)
      }
      return v1
    }
  }
  let shape = [...range.shape]
  return it({}, shape, 0, start)
}

/**
 * Return the minimum/maximum across all range values,
 * ignoring null's.
 */
export function minMax (range) {
  return [
   reduce(range, (v1,v2) => {
     // minimum ignoring null's
     if (v2 === null) return v1
     else return v1 < v2 ? v1 : v2
     }, Infinity),
   reduce(range, (v1,v2) => {
     // maximum ignoring null's
     if (v2 === null) return v1
     else return v1 > v2 ? v1 : v2
     }, -Infinity)
   ]
}
