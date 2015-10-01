import L from 'leaflet'

/**
 * Default function that checks if two Parameter objects describe
 * the same thing. No magic is applied here. Exact match or nothing.
 */
function defaultMatch (p1, p2) {
  if (!p1.observedProperty.id || !p2.observedProperty.id) {
    return false
  }
  if (p1.observedProperty.id !== p2.observedProperty.id) {
    return false
  }
  if (p1.unit && p2.unit) {
    if (p1.unit.id && p2.unit.id && p1.unit.id !== p2.unit.id) {
      return false
    }
    if (p1.unit.symbol && p2.unit.symbol && p1.unit.symbol !== p2.unit.symbol) {
      return false
    }
  } else if (p1.unit || p2.unit) { // only one of both has units
    return false
  }
  if (p1.categories && p2.categories) {
    if (p1.categories.length !== p2.categories.length) {
      return false
    }
    let idMissing = cat => !cat.id
    if (p1.categories.some(idMissing) || p2.categories.some(idMissing)) {
      return false
    }
    for (let cat1 of p1.categories) {
      if (!p2.categories.some(cat2 => cat1.id === cat2.id)) {
        return false
      }
    }
  } else if (p1.categories || p2.categories) { // only one of both has categories
    return false
  }
  return true
}

class ParameterSync extends L.Class {
  constructor (options) {
    this._syncProps = options.syncProperties || {}
    this._match = options.match || defaultMatch
    this._paramLayers = new Map() // Parameter -> Set
    this._layerListeners = new Map() // ILayer -> (type -> listener)
  }
  
  addLayer (layer) {
    if (!layer.parameter) {
      return   
    }
    let params = Array.from(this._paramLayers.keys())
    let match = params.find(p => this._match(p, layer.parameter))
    
    this._syncProperties(layer, this._paramLayers.get(match) || [])
    
    let param
    if (!match) {
      param = layer.parameter
      this._paramLayers.set(param, new Set([layer]))
    } else {
      param = match
      this._paramLayers.get(param).add(layer)
    }
    
    this._registerLayerListeners(layer, param)
    
    if (!match) {
      this.fire('parameterAdd', {syncLayer: this._getSyncLayer(param)})
    }
  }
  
  _removeLayer (layer, param) {
    for (let [type, fn] of this._layerListeners.get(layer).entries()) {
      layer.off(type, fn)
    }
    this._layerListeners.delete(layer)
    this._paramLayers.get(param).delete(layer)
    if (this._paramLayers.get(param).size === 0) {
      this._paramLayers.delete(param)
      // underscore since the 'parameterremove' event of the syncLayer should be used
      // from the outside
      this.fire('_parameterRemove', {param: param})
    }
  }
  
  _registerLayerListeners (layer, param) {
    let listeners = [
      ['remove', e => {
        this._removeLayer(layer, param)
      }]
    ]
    for (let prop : Object.keys(this._syncProps)) {
      let propreduce = this._syncProps[prop]
      let type = prop + 'Change' // our convention is camel case
      let listener = () => {
        // TODO handle change, sync props of other layers
      }
      listeners.push([type, listener])
    }
    for (let [type, fn] of listeners) {
      layer.on(type, fn)
    }
    this._layerListeners.set(param, new Map(listener))
  }
  
  _syncProperties(layerToSync, existingLayers) {
    
  }
  
  _getSyncLayer (param) {
    
  }
}

ParameterSync.include(L.Mixin.Events)

// work-around for Babel bug, otherwise ParameterSync cannot be referenced here
export { ParameterSync as default }
