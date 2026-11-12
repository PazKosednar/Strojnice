import type { Wall } from '../core/scene'
import { wallDirection, wallLength } from '../core/wallGeometry'
import { uprightAngle } from './svgPoints'
import { worldToScreen, type View } from './viewport'

interface Props {
  walls: readonly Wall[]
  view: View
}

/** Length of every wall (mm) written beside the wall, on its right-hand side. */
export function PlanDimensions({ walls, view }: Props) {
  return (
    <g className="plan-dimensions">
      {walls.map((wall) => {
        const d = wallDirection(wall)
        const mid = {
          x: (wall.start.x + wall.end.x) / 2,
          y: (wall.start.y + wall.end.y) / 2,
        }
        const screenMid = worldToScreen(view, mid)
        // Right-hand normal in world (d.y, -d.x) -> screen (d.y, d.x) because y is flipped.
        const gap = (wall.thickness / 2) * view.scale + 10
        const x = screenMid.x + d.y * gap
        const y = screenMid.y + d.x * gap
        const angle = uprightAngle(view, wall.start, wall.end)
        return (
          <text
            key={wall.id}
            x={x}
            y={y}
            transform={`rotate(${angle.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})`}
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {Math.round(wallLength(wall))}
          </text>
        )
      })}
    </g>
  )
}
