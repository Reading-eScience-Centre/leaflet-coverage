var System = require("jspm");

function mocha_workaround(testCount) {
  it("ignoreme", function(done) {
    this.timeout(5000)
    var iv = setInterval(function() {
      if (testCount === 0) {
        clearInterval(iv)
        done()
      }
    }, 500)
  })
  var oldit = it
  it = function(name, fn) {
    testCount--
    oldit(name, fn)
  }
}

function import(name) {
  return importAll([name]).then(function(mods) {
    return mods[0]
  })
}

function importAll(names) {
  return Promise.all(names.map(function(n) {return System.import(name)}).catch(function(e) {
    describe("JSPM", function() {
      it("error", function() {
          assert.fail(null, "", e)
      })
    })
  })
}