/**
 * A coverage data layer.
 * 
 * The `options` object of the constructor supports at a minimum the `parameter` property
 * which is the key of the coverage parameter to visualize.
 * All currently implemented classes also support the `palette` and `paletteExtent` properties.
 * All classes except {@link Grid} support the `defaultColor` property to specify the no-data color.
 * 
 * @typedef {L.Layer} DataLayer
 * @property {Coverage} coverage
 * @property {Parameter} parameter
 * @property {function():L.LatLngBounds} getBounds()
 */

/**
 * A coverage point-like data layer.
 * 
 * @typedef {DataLayer} PointDataLayer
 * @property {function} getValue() Return the displayed value (number, or null for no-data), or undefined if no parameter is set.
 * @property {function} _getColor(val) Returns a CSS color string or an  `{r: number, g: number, b: number}` array for the given data value.
 * @property {function} getLatLng() Returns the geographical position of the coverage.
 * @property {boolean} showNoData Whether to draw the point if there is no data.
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