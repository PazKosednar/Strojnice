import { endGeometry, pipeEndKey, resolveEnd } from '../core/pipeEnds'
import { UNKNOWN_PIPE_COLOR } from '../core/pipesTo3d'
import type { Scene } from '../core/scene'
import type { EndState } from './endStates'
import { worldToScreen, type View } from './viewport'

interface Props {
  scene: Scene
  view: View
  states: ReadonlyMap<string, EndState>
  selectedId: string | null
  hiddenSystems: readonly string[]
}

/** Wall terminals: a square on the wall axis in the system colour, with the tag beside it. */
export function PlanTerminals({ scene, view, states, selectedId, hiddenSystems }: Props) {
  const colors = new Map(scene.settings.systems.map((s) => [s.id, s.color]))
  return (
    <g className="plan-terminals">
      {scene.terminals.map((terminal) => {
        if (hiddenSystems.includes(terminal.systemId)) return null
        const resolved = resolveEnd(scene, { kind: 'terminal', terminalId: terminal.id })
        const geometry = resolved && endGeometry(scene, resolved)
        if (!geometry) return null
        const p = worldToScreen(view, geometry.point)
        const state = states.get(pipeEndKey({ kind: 'terminal', terminalId: terminal.id }))
        const selected = selectedId === terminal.id
        return (
          <g
            key={terminal.id}
            data-testid={`terminal-${terminal.id}`}
            data-tag={terminal.tag}
            className={`end-${state ?? 'normal'}`}
          >
            <rect
              x={p.x - 6}
              y={p.y - 6}
              width={12}
              height={12}
              fill={colors.get(terminal.systemId) ?? UNKNOWN_PIPE_COLOR}
              stroke={selected ? '#2563eb' : '#111827'}
              strokeWidth={selected ? 3 : 1.5}
            />
            <text x={p.x + 10} y={p.y - 8} className="terminal-tag">
              {terminal.tag}
            </text>
          </g>
        )
      })}
    </g>
  )
}
