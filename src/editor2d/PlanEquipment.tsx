import { clearanceZones } from '../core/clearances'
import {
  equipmentFootprint,
  footprintSize,
  localToWorld,
  portWorld,
} from '../core/equipmentGeometry'
import { UNKNOWN_SYSTEM_COLOR } from '../core/equipmentTo3d'
import type { Equipment, Scene } from '../core/scene'
import type { Selection } from '../stores/editorStore'
import { toSvgPoints } from './svgPoints'
import { worldToScreen, type View } from './viewport'

const COLORS = {
  fill: '#e8eef7',
  stroke: '#334155',
  selected: '#2563eb',
  conflict: '#dc2626',
  clearance: '#b45309',
}

/** Length of the direction tick on horizontal ports (screen px). */
const PORT_TICK = 9

interface ShapeProps {
  equipment: Equipment
  view: View
  /** System id -> colour. */
  systemColors: ReadonlyMap<string, string>
  selected?: boolean
  conflict?: boolean
  showClearances?: boolean
  /** Placement preview: drawn translucent and ignored by tests/selection. */
  ghost?: boolean
}

/** One equipment item in the plan: clearance zones, outline, front edge, ports and tag. */
export function EquipmentShape({
  equipment,
  view,
  systemColors,
  selected = false,
  conflict = false,
  showClearances = false,
  ghost = false,
}: ShapeProps) {
  const footprint = equipmentFootprint(equipment)
  const stroke = conflict ? COLORS.conflict : selected ? COLORS.selected : COLORS.stroke
  const strokeWidth = conflict || selected ? 2 : 1
  const centre = worldToScreen(view, equipment.position)
  const { width, depth } = footprintSize(equipment.type)

  // Front edge (box) or a tick from the centre to the front (cylinder) shows the orientation.
  const frontLine =
    footprint.kind === 'polygon'
      ? [footprint.points[0]!, footprint.points[1]!]
      : [equipment.position, localToWorld(equipment, { x: 0, y: -depth / 2 })]

  return (
    <g
      opacity={ghost ? 0.55 : 1}
      pointerEvents={ghost ? 'none' : undefined}
      data-testid={ghost ? 'equipment-ghost' : `equipment-${equipment.id}`}
      data-tag={equipment.tag}
      data-conflict={conflict || undefined}
    >
      {showClearances &&
        clearanceZones(equipment)
          .filter((zone) => zone.side !== 'top' && zone.footprint.kind === 'polygon')
          .map((zone) => (
            <polygon
              key={zone.side}
              points={toSvgPoints(
                view,
                zone.footprint.kind === 'polygon' ? zone.footprint.points : [],
              )}
              fill="none"
              stroke={COLORS.clearance}
              strokeDasharray="5 4"
            />
          ))}
      {footprint.kind === 'polygon' ? (
        <polygon
          points={toSvgPoints(view, footprint.points)}
          fill={COLORS.fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
      ) : (
        <circle
          cx={centre.x}
          cy={centre.y}
          r={footprint.radius * view.scale}
          fill={COLORS.fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
      )}
      <polyline points={toSvgPoints(view, frontLine)} stroke={stroke} strokeWidth={3} />
      {equipment.type.ports.map((port) => {
        const { position, direction } = portWorld(equipment, port)
        const p = worldToScreen(view, position)
        const color = systemColors.get(port.systemId) ?? UNKNOWN_SYSTEM_COLOR
        return (
          <g key={port.id}>
            {(direction.x !== 0 || direction.y !== 0) && (
              <line
                x1={p.x}
                y1={p.y}
                x2={p.x + direction.x * PORT_TICK}
                y2={p.y - direction.y * PORT_TICK}
                stroke={color}
                strokeWidth={3}
              />
            )}
            <circle cx={p.x} cy={p.y} r={4} fill={color} stroke="#fff" strokeWidth={1} />
          </g>
        )
      })}
      <text
        x={centre.x}
        y={centre.y}
        textAnchor="middle"
        dominantBaseline="middle"
        className="equipment-tag"
        fontSize={Math.max(9, Math.min(13, (width * view.scale) / 5))}
      >
        {equipment.tag}
      </text>
    </g>
  )
}

interface Props {
  scene: Scene
  view: View
  selection: Selection
  /** Ids of equipment involved in collisions or clearance violations. */
  conflicts: ReadonlySet<string>
  showClearances: boolean
}

/** All placed equipment. */
export function PlanEquipment({ scene, view, selection, conflicts, showClearances }: Props) {
  const systemColors = new Map(scene.settings.systems.map((s) => [s.id, s.color]))
  return (
    <g>
      {scene.equipment.map((equipment) => (
        <EquipmentShape
          key={equipment.id}
          equipment={equipment}
          view={view}
          systemColors={systemColors}
          selected={selection?.kind === 'equipment' && selection.id === equipment.id}
          conflict={conflicts.has(equipment.id)}
          showClearances={showClearances}
        />
      ))}
    </g>
  )
}
