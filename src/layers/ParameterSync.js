import L from 'leaflet'

import EventMixin from '../util/EventMixin.js'

/**
 * Default function that checks if two Parameter objects describe
 * the same thing. No magic is applied here. Exact match or nothing.
 */
function defaultMatch (p1, p2) {
  if (p1.id && p2.id && p1.id === p2.id) {
    return true
  }
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

/**
 * Synchronizes visualization options of multiple renderer layers with matching Parameter
 * and exposes a combined view of those options in form of a virtual layer object.
 * 
 * A common use case for this is to have equal palettes and only a single legend
 * for multiple layers describing the same parameter.
 * 
 * Synchronizing visualization options means synchronizing certain common properties
 * of the layer instances. For example, the palette extents of two layers can be
 * synchronized by merging the extents of both. The logic for doing that has to
 * be specified in terms of binary functions supplied in the constructor.
 * 
 * By default, a simple algorithm determines if two Parameter objects are equivalent
 * by checking whether things like observedPropery have the same ID, units are the same,
 * etc. This default algorithm can be replaced with a custom one. Such a custom
 * algorithm could relate different vocabularies with each other or perform other checks.
 * 
 * @example
 * let paramSync = new C.ParameterSync({
 *   syncProperties: {
 *     palette: (p1, p2) => p1,
 *     paletteExtent: (e1, e2) => e1 && e2 ? [Math.min(e1[0], e2[0]), Math.max(e1[1], e2[1])] : null
 *   }
 * }).on('parameterAdd', e => {
 *   // The virtual sync layer proxies the synced palette, paletteExtent, and parameter.
 *   // The sync layer will fire a 'remove' event once all real layers for that parameter were removed.
 *   let layer = e.syncLayer
 *   if (layer.palette) {
 *     C.legend(layer, {
 *       position: 'bottomright'
 *     }).addTo(map)
 *   }
 * })
 * let layer = C.layerFactory()(cov).on('add', e => {
 *   // Only add the layer to the ParameterSync instance once it has initialized.
 *   // We can use the 'add' event for that.
 *   paramSync.addLayer(e.target)
 * })
 */
export class ParameterSync extends EventMixin(L.Class) {
  
  /**
   * @param {Object} options
   * @param {Object} options.syncProperties - 
   *   An object that defines which properties shall be synchronized and how.
   *   Each key is a property name where the value is a binary function that merges
   *   the values of two such properties.
   * @param {Function} [options.match] - 
   *   Custom function that checks if two Parameter objects shall be equivalent.
   *   The default function is simple and checks for identity of several properties.
   */
  constructor (options) {
    super()
    this._syncProps = options.syncProperties || {}
    this._match = options.match || defaultMatch
    this._paramLayers = new Map() // Map (Parameter -> Set(Layer))
    this._layerListeners = new Map() // Map (Layer -> Map(type -> listener))
    this._propSyncing = new Set() // Set (property name) 
  }
  
  /**
   * Adds a layer that will be synchronized.
   * 
   * Synchronization stops automatically when the layer fires a 'remove' event.
   * 
   * @param {ILayer} layer - The layer to synchronize.
   * @fires ParameterSync#parameterAdd - When a layer with a new parameter was added.
   */
  addLayer (layer) {
    if (!layer.parameter) {
      console.log('layer has no parameter, skipping parameter sync')
      return   
    }
    let params = Array.from(this._paramLayers.keys())
    let match = params.find(p => this._match(p, layer.parameter))
    
    let param
    if (!match) {
      param = layer.parameter
      this._paramLayers.set(param, new Set([layer]))
    } else {
      param = match
      this._paramLayers.get(param).add(layer)
      this._syncProperties(param)
    }
    
    this._registerLayerListeners(layer, param)
    
    if (!match) {
      /**
       * Parameter Add event.
       * 
       * @event ParameterSync#parameterAdd
       * @type {object}
       * @property {SyncLayer} syncLayer - 
       *   A virtual layer that proxies the synchronized properties for a single parameter.
       *   If all layers of that parameter are removed, this layer fires a 'remove' event,
       *   signalling that the parameter is not present anymore.
       */
      this.fire('parameterAdd', {syncLayer: new SyncLayer(param, this)})
    }
  }
  /**
   * Pause synchronization. This is useful when a property of
   * many layers has to be set manually (like paletteExtent = 'fov') and
   * the synchronization shall happen afterwards (see resume()).
   */
  pause () {
    this.paused = true
  }
  
  /**
   * Resumes synchronization.
   * 
   * @param {bool} [sync] If true, then all layers will be synchronized immediately.
   */
  resume (sync) {
    this.paused = false
    if (sync) {
      for (let param of this._paramLayers.keys()) {
        this._syncProperties(param)
      }
    }
  }
  
  _removeLayer (layer, param) {
    for (let [type, fn] of this._layerListeners.get(layer)) {
      layer.off(type, fn)
    }
    this._layerListeners.delete(layer)
    this._paramLayers.get(param).delete(layer)
    if (this._paramLayers.get(param).size === 0) {
      this._paramLayers.delete(param)
      // underscore since the 'remove' event of the syncLayer should be used
      // from the outside
      this.fire('_parameterRemove', {param: param})
    }
  }
  
  _registerLayerListeners (layer, param) {
    let listeners = new Map([
      ['remove', () => this._removeLayer(layer, param)]
    ])
    for (let prop of Object.keys(this._syncProps)) {
      let type = prop + 'Change' // our convention is camel case
      // TODO does it make sense to unify again, or should it just propagate unchanged?
      listeners.set(type, () => this._syncProperty(param, prop))
    }
    for (let [type, fn] of listeners) {
      layer.on(type, fn)
    }
    this._layerListeners.set(layer, listeners)
  }
  
  _syncProperties (param) {
    for (let prop of Object.keys(this._syncProps)) {
      this._syncProperty(param, prop)
    }
  }
  
  _syncProperty (param, prop) {
    if (this.paused || this._propSyncing.has(prop)) {
      return
    }
    let propreduce = this._syncProps[prop]
    let unified = [...this._paramLayers.get(param)].map(l => l[prop]).reduce(propreduce)
    // While we unify properties, stop listening for changes to prevent a cycle.
    this._propSyncing.add(prop)
    for (let layer_ of this._paramLayers.get(param)) {
      layer_[prop] = unified
    }
    this._propSyncing.delete(prop)
    this.fire('_syncPropChange', {param: param, prop: prop})
  }
}

export class SyncLayer extends EventMixin(L.Class) {
  constructor (param, paramSync) {
    super()
    this._param = param
    paramSync.on('_parameterRemove', e => {
      if (e.param === param) {
        this.fire('remove')
      }
    })
    paramSync.on('_syncPropChange', e => {
      if (e.param === param) {
        this.fire(e.prop + 'Change')
      }
    })
    let layers = () => paramSync._paramLayers.get(param)
    for (let prop of Object.keys(paramSync._syncProps)) {
      Object.defineProperty(this, prop, {
        get: () => layers().values().next().value[prop],
        set: v => {
          paramSync._propSyncing.add(prop)
          for (let layer of layers()) {
            layer[prop] = v
          }
          paramSync._propSyncing.delete(prop)
          this.fire(prop + 'Change')
        },
        enumerable: true
      })
    }
  }
  
  get parameter () {
    return this._param
  }
}
