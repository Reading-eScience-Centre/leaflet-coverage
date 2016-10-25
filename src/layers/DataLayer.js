/**
 * A coverage data layer.
 * 
 * @typedef {L.Layer} DataLayer
 */

/**
 * The `afterAdd` event, signalling that the data layer is initialized and was added to the map.
 * Only after this event was fired, other elements like legends or axis controls may be added.
 * The event ensures that the necessary coverage data has been loaded.
 * 
 * @typedef {L.Event} DataLayer#afterAdd
 */

/**
 * The `dataLoading` event, signalling that data loading has started.
 * 
 * @typedef {L.Event} DataLayer#dataLoading
 */

/**
 * The `dataLoad` event, signalling that data loading has finished (also in case of errors).
 * 
 * @typedef {L.Event} DataLayer#dataLoad
 */

/**
 * The `error` event, signalling that data loading has failed.
 * 
 * @typedef {L.Event} DataLayer#error
 */

/**
 * The `axisChange` event, signalling that an axis coordinate has changed.
 * 
 * @typedef {L.Event} DataLayer#axisChange
 * @property {string} axis The axis that changed. Corresponds to a property of the same name in the data layer.
 *      For example, 'time' or 'vertical'.
 */