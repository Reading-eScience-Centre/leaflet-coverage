import {DraggablePopupMixin} from './DraggablePopupMixin.js'
import {ValuePopup} from './ValuePopup.js'

/**
 * Like {@link ValuePopup} but draggable and updates its content while dragging.
 * 
 * @extends {ValuePopup}
 * @extends {DraggablePopupMixin}
 */
export class DraggableValuePopup extends DraggablePopupMixin(ValuePopup) {}