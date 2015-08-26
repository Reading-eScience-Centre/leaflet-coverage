import assert from 'assert'
import ndarray from 'ndarray'
import * as opsnull from 'leaflet-coverage/util/ndarray-ops-null'

describe("util/ndarray-ops-null methods", function() {
  var arr = ndarray([1,null,0,4])
  var nullarr = ndarray([null,null])
  describe("#nullargmin", function() {
    it("returns the index of the minimum element ignoring nulls", function() {
      var idx = opsnull.nullargmin(arr)
      assert.equal(idx, 2)
    })
    it("returns null if the array only contains nulls", function() {
      var idx = opsnull.nullargmin(nullarr)
      assert.strictEqual(idx, null)
    })
  })
  describe("#nullargmax", function() {
    it("returns the index of the maximum element ignoring nulls", function() {
      var idx = opsnull.nullargmax(arr)
      assert.equal(idx, 3)
    })
    it("returns null if the array only contains nulls", function() {
      var idx = opsnull.nullargmax(nullarr)
      assert.strictEqual(idx, null)
    })
  })
})