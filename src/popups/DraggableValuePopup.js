import {DraggablePopupMixin} from './DraggablePopupMixin.js'
import {ValuePopup} from './ValuePopup.js'

/**
 * Like CoverageValuePopup but draggable and updates its content while dragging.
 */
export class DraggableValuePopup extends DraggablePopupMixin(ValuePopup) {}