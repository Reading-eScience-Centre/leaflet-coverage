import L from 'leaflet'

/**
 * A control that fires events.
 */
class EventedControl extends L.Control {}

EventedControl.include(L.Mixin.Events)

//work-around for Babel bug, otherwise EventedControl cannot be referenced here
export { EventedControl as default }