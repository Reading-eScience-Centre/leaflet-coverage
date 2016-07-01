import assert from 'assert'

import * as utils from 'src/util/arrays.js'
import ndarray from 'ndarray'

describe("util/arrays methods", () => {
  describe("#indicesOfNearest", () => {
    var arr = [1,2,3]
    it("returns [0,0] if value below min", () => {
      var ind = utils.indicesOfNearest(arr, 0)
      assert.deepEqual(ind, [0,0])
    })
    it("returns [len-1,len-1] if value above max", () => {
      var ind = utils.indicesOfNearest(arr, 4)
      assert.deepEqual(ind, [arr.length - 1, arr.length - 1])
    })
    it("returns [idx(val),idx(val)] if value exists", () => {
      var ind = utils.indicesOfNearest(arr, 2)
      assert.deepEqual(ind, [1, 1])
    })
    it("returns neighbors if value in-between two values", () => {
      var ind = utils.indicesOfNearest(arr, 2.5)
      assert.deepEqual(ind, [1, 2])
    })
    it("handles descending arrays", () => {
      // we should run the same tests as above for descending
      var arr = [3,2,1]
      var ind = utils.indicesOfNearest(arr, 2.5)
      assert.deepEqual(ind, [0, 1])
    })
  })
  describe("#indexOfNearest", () => {
    var arr = [1,2,3]
    it("returns the index of the nearest value", () => {
      var ind = utils.indexOfNearest(arr, 2.4)
      assert.equal(ind, 1)
    })
  })
})
