import assert from 'assert'

import * as transform from 'leaflet-coverage/util/transform.js'

describe("util/transform methods", () => {
  describe("#withParameters", () => {
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
  
  describe("#withCategories", () => {
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
