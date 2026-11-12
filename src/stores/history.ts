/** Undo/redo history of immutable snapshots. */
export interface History<T> {
  past: T[]
  present: T
  future: T[]
}

export const HISTORY_LIMIT = 100

export function createHistory<T>(present: T): History<T> {
  return { past: [], present, future: [] }
}

/** Records a new present state; clears redo. Keeps at most `limit` undo steps. */
export function pushHistory<T>(h: History<T>, next: T, limit = HISTORY_LIMIT): History<T> {
  if (next === h.present) return h
  const past = [...h.past, h.present]
  return { past: past.slice(Math.max(0, past.length - limit)), present: next, future: [] }
}

/** Replaces the present without recording a step (e.g. live preview while dragging). */
export function replacePresent<T>(h: History<T>, next: T): History<T> {
  return { ...h, present: next }
}

export function undo<T>(h: History<T>): History<T> {
  const previous = h.past[h.past.length - 1]
  if (previous === undefined) return h
  return { past: h.past.slice(0, -1), present: previous, future: [h.present, ...h.future] }
}

export function redo<T>(h: History<T>): History<T> {
  const [next, ...rest] = h.future
  if (next === undefined) return h
  return { past: [...h.past, h.present], present: next, future: rest }
}
