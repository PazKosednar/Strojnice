import { endDiameter, pipeEndKey, resolveEnd } from '../core/pipeEnds'
import { checkConnection, endInUse } from '../core/pipeOps'
import type { PipeEnd, Scene } from '../core/scene'

export type PickResult =
  /** Connect `source` to `end`. */
  | { kind: 'connect'; end: PipeEnd }
  /** Make `end` the (new) first end of the pipe. */
  | { kind: 'source'; end: PipeEnd }
  /** Nothing usable under the cursor. */
  | { kind: 'none' }

const key = pipeEndKey

/**
 * Decides what a click with the pipe tool means when several ports or terminals lie at
 * the clicked plan point (e.g. ports of a cylinder above each other):
 * - with a first end picked: connect to the first valid target among them; clicking the
 *   picked end's own position again selects the next end there instead (cycling);
 * - without one: pick the first free end that has a diameter (else simply the first).
 * `candidates` are ordered nearest first (findEndsAt).
 */
export function pickEnd(
  scene: Scene,
  candidates: readonly PipeEnd[],
  source: PipeEnd | null,
): PickResult {
  if (candidates.length === 0) return { kind: 'none' }
  if (source) {
    const target = candidates.find(
      (end) => key(end) !== key(source) && checkConnection(scene, source, end).ok,
    )
    if (target) return { kind: 'connect', end: target }
    const index = candidates.findIndex((end) => key(end) === key(source))
    if (index >= 0) {
      // Same spot clicked again: cycle to the next end at this position.
      return { kind: 'source', end: candidates[(index + 1) % candidates.length]! }
    }
    // Not connectable: report the first one (the caller shows why).
    return { kind: 'connect', end: candidates[0]! }
  }
  const usable = candidates.find((end) => {
    const resolved = resolveEnd(scene, end)
    return resolved && endDiameter(resolved) !== undefined && !endInUse(scene, end)
  })
  return { kind: 'source', end: usable ?? candidates[0]! }
}
