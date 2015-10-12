import assert from 'assert'
import * as CovJSON from 'covjson-reader'

import * as transform from 'leaflet-coverage/util/transform.js'

describe("util/transform methods", () => {
  describe("#withParameters", () => {
    it('shall not modify the original coverage', () => {
      let cov = {
          parameters: new Map([['LC', 
            {
              name: 'foo'
            }]])
      }
      let newparams = new Map([['LC', 
         {
           name: 'bar'
         }]])
      
      let newcov = transform.withParameters(cov, newparams)
      
      assert.equal(cov.parameters.get('LC').name, 'foo')
      assert.equal(newcov.parameters.get('LC').name, 'bar') 
    })   
  })
  
  describe("#withCategories", () => {
    it('shall not modify the original coverage', () => {
      let cov = {
          parameters: new Map([['LC', 
            {
              categories: [{
                value: 1
              }]
            }]])
      }
      let newcats = [{
        value: 2
      }]
      
      let newcov = transform.withCategories(cov, 'LC', newcats)
      
      assert.strictEqual(cov.parameters.get('LC').categories[0].value, 1)
      assert.strictEqual(newcov.parameters.get('LC').categories[0].value, 2)
    })
  })
  
  describe("#pnpoly", () => {
    it('should produce correct results', () => {
      let poly = [[1, 10], [2, 10], [2, 20], [1, 20]]
      assert(transform.pnpoly(1.5, 15, poly))
      assert(!transform.pnpoly(0.5, 15, poly))
      assert(!transform.pnpoly(2.5, 15, poly))
      assert(!transform.pnpoly(1.5, 25, poly))
      assert(!transform.pnpoly(1.5, 5, poly))
    })
  })
  
  describe("#maskedByPolygon", () => {
    let covjson = {
      "type" : "GridCoverage",
      "domain" : {
        "type" : "Grid",
        "x" : [-10,5],
        "y" : [40]
      },
      "parameters" : {
        "ICEC": {
          "type" : "Parameter",
          "unit" : { "symbol" : "fraction" },
          "observedProperty" : {
            "label" : { "en": "Sea Ice Concentration" }
          }
        }
      },
      "ranges" : {
        "type" : "RangeSet",
        "ICEC" : {
          "type" : "Range",
          "values" : [ 0.5, 0.6 ]
        }
      }
    }
    // contains [-10,40] coordinate, but not [5,40]
    let polygon = {
      "type": "Polygon",
      "coordinates": [
        [ [-15, 50], [-10, 30], [0, 50], [-15, 50] ]
      ]
    }
    
    it('shall not modify the original coverage', () => {
      return CovJSON.read(JSON.parse(JSON.stringify(covjson))).then(cov => {
        let newcov = transform.maskByPolygon(cov, polygon)
        return cov.loadRange('ICEC').then(range => {
          assert.strictEqual(range.values.get(0, 0, 0, 0), 0.5)
          assert.strictEqual(range.values.get(0, 0, 0, 1), 0.6)
        })
      })
    })
    
    it('shall mask the correct range values', () => {
      return CovJSON.read(JSON.parse(JSON.stringify(covjson))).then(cov => {
        let newcov = transform.maskByPolygon(cov, polygon)
        return newcov.loadRange('ICEC').then(range => {
          assert.strictEqual(range.values.get(0, 0, 0, 0), 0.5)
          assert.strictEqual(range.values.get(0, 0, 0, 1), null)
        })
      })
    })
  })
})
