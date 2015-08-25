var assert = require("assert")
var jspm = require("./jspm-helper")

jspm.mocha_workaround(5)

jspm.importAll(["src/util/utils", "ndarray"]).then(function(mods) {
  var utils = mods[0]
  var ndarray = mods[1]

  describe("util/utils methods", function() {
    describe("#indicesOfNearest", function() {
      var arr = [1,2,3]
      it("returns [0,0] if value below min", function() {
        var ind = utils.indicesOfNearest(arr, 0)
        assert.deepEqual(ind, [0,0])
      })
      it("returns [len-1,len-1] if value above max", function() {
        var ind = utils.indicesOfNearest(arr, 4)
        assert.deepEqual(ind, [arr.length - 1, arr.length - 1])
      })
      it("returns [idx(val),idx(val)] if value exists", function() {
        var ind = utils.indicesOfNearest(arr, 2)
        assert.deepEqual(ind, [1, 1])
      })
      it("returns neighbors if value in-between two values", function() {
        var ind = utils.indicesOfNearest(arr, 2.5)
        assert.deepEqual(ind, [1, 2])
      })
      it("handles descending arrays", function() {
        // we should run the same tests as above for descending
        var arr = [3,2,1]
        var ind = utils.indicesOfNearest(arr, 2.5)
        assert.deepEqual(ind, [0, 1])
      })
    })
    describe("#indexOfNearest", function() {
      var arr = [1,2,3]
      it("returns the index of the nearest value", function() {
        var ind = utils.indexOfNearest(arr, 2.4)
        assert.equal(ind, 1)
      })
    })
    describe("#asSciJSndarray", function() {
      it("returns the same object if already a SciJS ndarray", function() {
        var ndarr = ndarray([1,2,3,4], [2,2])
        var ndarr2 = utils.asSciJSndarray(ndarr)
        assert.strictEqual(ndarr2, ndarr)
      })
      it("correctly wraps our ndarray-like object as a SciJS ndarray", function() {
        var arr = [[1,2,3],
                   [4,5,6]]
        // an object which has get(i,j,..) and .shape
        var ndobj = {
            shape: [arr.length, arr[0].length],
            get: function (i,j) {
              return arr[i][j]
            }
        }
        var ndarr = utils.asSciJSndarray(ndobj)
        assert.deepEqual(ndarr.shape, ndobj.shape)
        for (var i=0; i < ndobj.shape[0]; i++) {
          for (var j=0; j < ndobj.shape[1]; j++) {
            assert.strictEqual(ndarr.get(i,j), ndobj.get(i,j))
          }
        }
      })
    })
  })
})
