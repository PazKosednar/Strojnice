import type { Point } from '../core/scene'
import { pointAtDistance } from '../core/wallGeometry'

/** Max digits accepted for a typed length (up to 9 999 999 mm). */
const MAX_DIGITS = 7

/** Parses a typed wall length; positive integer mm or null. */
export function parseTypedLength(typed: string): number | null {
  if (!/^\d+$/.test(typed)) return null
  const value = Number(typed)
  return value > 0 ? value : null
}

/**
 * Applies a key to the typed length. Returns the new text, or null if the key is not
 * part of length input (so the caller can handle it otherwise).
 */
export function editTypedLength(typed: string, key: string): string | null {
  if (/^\d$/.test(key)) return typed.length < MAX_DIGITS ? typed + key : typed
  if (key === 'Backspace') return typed.slice(0, -1)
  return null
}

/**
 * End point of the wall being drawn. With a typed length the direction comes from the
 * (snapped) cursor and the distance from the typed value; otherwise it is the cursor.
 */
export function draftTarget(start: Point, cursor: Point, typed: string): Point {
  const length = parseTypedLength(typed)
  if (length === null) return cursor
  const dx = cursor.x - start.x
  const dy = cursor.y - start.y
  const angle = dx === 0 && dy === 0 ? 0 : Math.atan2(dy, dx)
  return pointAtDistance(start, angle, length)
}
