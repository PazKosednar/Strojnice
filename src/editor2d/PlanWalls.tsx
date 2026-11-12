import type { Opening, Point, Scene, Wall } from '../core/scene'
import { pointAtOffset, wallDirection } from '../core/wallGeometry'
import { wallExtensions, wallOutline } from '../core/wallJoins'
import type { Selection } from '../stores/editorStore'
import { toSvgPoints } from './svgPoints'
import type { View } from './viewport'

interface Props {
  scene: Scene
  view: View
  selection: Selection
}

const SELECTED = '#2563eb'

function openingShapes(wall: Wall, opening: Opening) {
  const d = wallDirection(wall)
  const n = { x: -d.y, y: d.x }
  const half = wall.thickness / 2
  const a = pointAtOffset(wall, opening.offset)
  const b = pointAtOffset(wall, opening.offset + opening.width)
  const at = (p: Point, k: number) => ({ x: p.x + n.x * k, y: p.y + n.y * k })
  const body = [at(a, -half), at(b, -half), at(b, half), at(a, half)]

  if (opening.type === 'window') return { body, lines: [[a, b]], swing: null }

  // Door: leaf hinged at `a`, opening to the left side of the wall, with a quarter arc.
  const leafEnd = at(a, half + opening.width)
  const arc: Point[] = []
  for (let i = 0; i <= 16; i++) {
    const t = (i / 16) * (Math.PI / 2)
    const r = opening.width
    const base = at(a, half)
    arc.push({
      x: base.x + d.x * r * Math.cos(t) + n.x * r * Math.sin(t),
      y: base.y + d.y * r * Math.cos(t) + n.y * r * Math.sin(t),
    })
  }
  return { body, lines: [[at(a, half), leafEnd]], swing: arc }
}

/** Walls (with closed corners) and their openings. */
export function PlanWalls({ scene, view, selection }: Props) {
  const extensions = wallExtensions(scene.walls)
  return (
    <g>
      {scene.walls.map((wall) => {
        const selected = selection?.kind === 'wall' && selection.id === wall.id
        return (
          <polygon
            key={wall.id}
            data-testid={`wall-${wall.id}`}
            points={toSvgPoints(view, wallOutline(wall, extensions.get(wall.id)))}
            fill={selected ? '#bfd3ff' : '#a7adb5'}
            stroke={selected ? SELECTED : '#5b616a'}
            strokeWidth={selected ? 2 : 1}
          />
        )
      })}
      {scene.openings.map((opening) => {
        const wall = scene.walls.find((w) => w.id === opening.wallId)
        if (!wall) return null
        const selected = selection?.kind === 'opening' && selection.id === opening.id
        const stroke = selected ? SELECTED : '#374151'
        const { body, lines, swing } = openingShapes(wall, opening)
        return (
          <g key={opening.id} data-testid={`opening-${opening.id}`}>
            <polygon
              points={toSvgPoints(view, body)}
              fill="#ffffff"
              stroke={stroke}
              strokeWidth={selected ? 2 : 1}
            />
            {lines.map((line, i) => (
              <polyline
                key={i}
                points={toSvgPoints(view, line)}
                stroke={stroke}
                strokeWidth={selected ? 2 : 1}
              />
            ))}
            {swing && (
              <polyline
                points={toSvgPoints(view, swing)}
                fill="none"
                stroke={stroke}
                strokeDasharray="4 3"
              />
            )}
          </g>
        )
      })}
    </g>
  )
}
