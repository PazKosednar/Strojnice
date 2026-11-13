import { planBoxCorners } from '../core/planBox'
import type { PlanBox, Point3, Scene, ZoneKind } from '../core/scene'
import { toSvgPoints } from './svgPoints'
import { worldToScreen, type View } from './viewport'

const ZONE_CLASS: Record<ZoneKind, string> = {
  forbidden: 'zone-forbidden',
  avoid: 'zone-avoid',
  preferred: 'zone-preferred',
}

function outline(view: View, box: PlanBox): string {
  return toSvgPoints(view, planBoxCorners(box))
}

interface Props {
  scene: Scene
  view: View
  selection: { kind: string; id: string } | null
}

/** Zones (transparent, under everything else in the room). */
export function PlanZones({ scene, view, selection }: Props) {
  return (
    <g className="plan-zones">
      {scene.zones.map((zone) => (
        <polygon
          key={zone.id}
          data-testid={`zone-${zone.id}`}
          className={`zone ${ZONE_CLASS[zone.kind]}${
            selection?.kind === 'zone' && selection.id === zone.id ? ' selected' : ''
          }`}
          points={outline(view, zone)}
        >
          <title>{zone.name}</title>
        </polygon>
      ))}
    </g>
  )
}

/** Obstacles: grey with their tag and name. */
export function PlanObstacles({ scene, view, selection }: Props) {
  return (
    <g className="plan-obstacles">
      {scene.obstacles.map((o) => {
        const c = worldToScreen(view, o.center)
        const selected = selection?.kind === 'obstacle' && selection.id === o.id
        return (
          <g key={o.id} data-testid={`obstacle-${o.id}`} data-tag={o.tag}>
            <polygon
              className={`obstacle${selected ? ' selected' : ''}`}
              points={outline(view, o)}
            />
            <text x={c.x} y={c.y - 2} className="obstacle-tag" textAnchor="middle">
              {o.tag}
            </text>
            <text x={c.x} y={c.y + 12} className="obstacle-name" textAnchor="middle">
              {o.name}
            </text>
          </g>
        )
      })}
    </g>
  )
}

/** Marker of a highlighted place (e.g. a rule violation). */
export function PlanHighlight({ view, point }: { view: View; point: Point3 | null }) {
  if (!point) return null
  const p = worldToScreen(view, point)
  return (
    <g className="plan-highlight" data-testid="highlight">
      <circle cx={p.x} cy={p.y} r={14} />
      <circle cx={p.x} cy={p.y} r={3} />
    </g>
  )
}
