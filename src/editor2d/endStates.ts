import { checkConnection, endInUse } from '../core/pipeOps'
import { endDiameter, pipeEndKey, resolveEnd } from '../core/pipeEnds'
import type { PipeEnd, Scene } from '../core/scene'

/**
 * How a port or terminal is drawn:
 * - normal: default
 * - missing: port without an outer diameter (cannot be connected yet)
 * - source: first end picked with the pipe tool
 * - target: a valid second end for the picked source
 * - dim: not connectable to the picked source
 */
export type EndState = 'normal' | 'missing' | 'source' | 'target' | 'dim'

/** Drawing state of every end, keyed by pipeEndKey. */
export function endStates(scene: Scene, source: PipeEnd | null): Map<string, EndState> {
  const states = new Map<string, EndState>()
  const all: PipeEnd[] = [
    ...scene.equipment.flatMap((e) =>
      e.type.ports.map((p): PipeEnd => ({ kind: 'port', equipmentId: e.id, portId: p.id })),
    ),
    ...scene.terminals.map((t): PipeEnd => ({ kind: 'terminal', terminalId: t.id })),
  ]
  const sourceKey = source ? pipeEndKey(source) : null
  for (const end of all) {
    const key = pipeEndKey(end)
    const resolved = resolveEnd(scene, end)
    const missing = !!resolved && endDiameter(resolved) === undefined
    let state: EndState = missing ? 'missing' : 'normal'
    if (source) {
      if (key === sourceKey) state = 'source'
      else state = checkConnection(scene, source, end).ok ? 'target' : 'dim'
    } else if (!missing && endInUse(scene, end)) {
      state = 'normal'
    }
    states.set(key, state)
  }
  return states
}
