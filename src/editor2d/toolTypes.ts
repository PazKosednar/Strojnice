import type { Point } from '../core/scene'

/** Pointer position handed from the plan to the active tool. */
export interface PointerInfo {
  /** Cursor in plan coordinates (mm, not snapped). */
  world: Point
  /** Alt disables snapping. */
  altKey: boolean
  /** Pick tolerance around elements (mm at the current zoom). */
  tolerance: number
  /** Snap distance to endpoints and walls (mm at the current zoom). */
  snapDistance: number
  /** DOM element under the pointer. */
  target: Element
}

export const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')
