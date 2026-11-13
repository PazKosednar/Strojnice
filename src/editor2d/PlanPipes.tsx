import type { LineStyle, Pipe, RoutePoint, Scene } from '../core/scene'
import { UNKNOWN_PIPE_COLOR } from '../core/pipesTo3d'
import { worldToScreen, type View } from './viewport'

const DASHES: Record<LineStyle, string | undefined> = {
  solid: undefined,
  dashed: '10 6',
  dashdot: '12 4 2 4',
}

/** Horizontal run of a pipe at one height (drawn as one polyline so bends are rounded). */
interface Run {
  key: string
  pipe: Pipe
  points: RoutePoint[]
  /** First segment index of the run. */
  segment: number
  z: number
}

/** Splits routes into horizontal runs; vertical segments become markers. */
function runsOf(pipes: readonly Pipe[]): {
  runs: Run[]
  risers: { key: string; pipe: Pipe; at: RoutePoint; z: number }[]
} {
  const runs: Run[] = []
  const risers: { key: string; pipe: Pipe; at: RoutePoint; z: number }[] = []
  for (const pipe of pipes) {
    let current: Run | null = null
    pipe.route.forEach((a, i) => {
      const b = pipe.route[i + 1]
      if (!b) return
      if (a.x === b.x && a.y === b.y) {
        risers.push({ key: `${pipe.id}:r${i}`, pipe, at: a, z: Math.max(a.z, b.z) })
        current = null
        return
      }
      if (current && current.z === a.z) {
        current.points.push(b)
      } else {
        current = { key: `${pipe.id}:${i}`, pipe, points: [a, b], segment: i, z: a.z }
        runs.push(current)
      }
    })
  }
  return { runs, risers }
}

interface Props {
  scene: Scene
  view: View
  hiddenSystems: readonly string[]
  selectedPipeId: string | null
  /** Selected route vertex of the selected pipe. */
  selectedVertex: number | null
}

/**
 * Pipes in the plan: colour and line style of their system, true outer diameter as line
 * width (at least 2 px), rounded bends. Higher runs are drawn on top of lower ones;
 * vertical runs are shown as a ring.
 */
export function PlanPipes({ scene, view, hiddenSystems, selectedPipeId, selectedVertex }: Props) {
  const systems = new Map(scene.settings.systems.map((s) => [s.id, s]))
  const visible = scene.pipes.filter((p) => !hiddenSystems.includes(p.systemId))
  const { runs, risers } = runsOf(visible)
  const items = [
    ...runs.map((run) => ({ kind: 'run' as const, z: run.z, run })),
    ...risers.map((riser) => ({ kind: 'riser' as const, z: riser.z, riser })),
  ].sort((a, b) => a.z - b.z)
  const selected = scene.pipes.find((p) => p.id === selectedPipeId)

  return (
    <g className="plan-pipes">
      {items.map((item) => {
        const pipe = item.kind === 'run' ? item.run.pipe : item.riser.pipe
        const system = systems.get(pipe.systemId)
        const color = system?.color ?? UNKNOWN_PIPE_COLOR
        const width = Math.max(2, pipe.outerDiameter * view.scale)
        if (item.kind === 'riser') {
          const p = worldToScreen(view, item.riser.at)
          return (
            <circle
              key={item.riser.key}
              cx={p.x}
              cy={p.y}
              r={Math.max(3, width * 0.8)}
              fill="#fff"
              stroke={color}
              strokeWidth={2}
              pointerEvents="none"
            />
          )
        }
        const points = item.run.points
          .map((pt) => {
            const s = worldToScreen(view, pt)
            return `${s.x.toFixed(1)},${s.y.toFixed(1)}`
          })
          .join(' ')
        return (
          <g key={item.run.key} data-testid={`pipe-${pipe.id}`} pointerEvents="none">
            {pipe.id === selectedPipeId && (
              <polyline
                points={points}
                fill="none"
                stroke="#2563eb"
                strokeOpacity={0.35}
                strokeWidth={width + 8}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            )}
            <polyline
              points={points}
              fill="none"
              stroke={color}
              strokeWidth={width}
              strokeDasharray={DASHES[system?.lineStyle ?? 'solid']}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </g>
        )
      })}
      {selected &&
        selected.route.slice(1, -1).map((pt, i) => {
          const s = worldToScreen(view, pt)
          const index = i + 1
          return (
            <rect
              key={index}
              data-vertex={index}
              className={`route-vertex${selectedVertex === index ? ' selected' : ''}`}
              x={s.x - 5}
              y={s.y - 5}
              width={10}
              height={10}
            />
          )
        })}
    </g>
  )
}
