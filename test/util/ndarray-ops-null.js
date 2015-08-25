var assert = require("assert")
var jspm = require("./jspm-helper")

jspm.mocha_workaround(5)

jspm.importAll(["src/util/ndarray-ops-null", "ndarray"]).then(function(mods) {
  var opsnull = mods[0]
  var ndarray = mods[1]

  describe("util/ndarray-ops-null methods", function() {
    var arr = ndarray([1,null,0,4])
    var nullarr = ndarray([null,null])
    describe("#nullargmin", function() {
      it("returns the index of the minimum element ignoring nulls", function() {
        var idx = opsnull.nullargmin(arr)
        assert.equal(idx, 2)
      })
      it("returns null if the array only contains nulls", function() {
        var idx = opsnull.nullargmin()
        assert.strictEqual(idx, null)
      })
    })
    describe("#nullargmax", function() {
      it("returns the index of the maximum element ignoring nulls", function() {
        var idx = opsnull.nullargmax(arr)
        assert.equal(idx, 3)
      })
      it("returns null if the array only contains nulls", function() {
        var idx = opsnull.nullargmax()
        assert.strictEqual(idx, null)
      })
    })
  })
})