import { directionVector, footprintSize } from '../core/equipmentGeometry'
import { UNKNOWN_SYSTEM_COLOR } from '../core/equipmentTo3d'
import type { EquipmentType, SystemDef } from '../core/scene'

interface Props {
  /** Type built from the form so far, or null while the dimensions are incomplete. */
  type: EquipmentType | null
  systems: readonly SystemDef[]
}

const W = 230
const H = 190
const PAD = 22

interface Rect {
  x0: number
  y0: number
  x1: number
  y1: number
}

interface Marker {
  key: string
  u: number
  v: number
  du: number
  dv: number
  color: string
}

interface DrawingProps {
  title: string
  body: Rect
  round: boolean
  zones: Rect[]
  markers: Marker[]
  topLabel: string
  bottomLabel: string
}

/** One orthographic view: u to the right, v up, fitted into the box. */
function Drawing({ title, body, round, zones, markers, topLabel, bottomLabel }: DrawingProps) {
  const all = [body, ...zones]
  const minU = Math.min(...all.map((r) => r.x0), ...markers.map((m) => m.u))
  const maxU = Math.max(...all.map((r) => r.x1), ...markers.map((m) => m.u))
  const minV = Math.min(...all.map((r) => r.y0), ...markers.map((m) => m.v))
  const maxV = Math.max(...all.map((r) => r.y1), ...markers.map((m) => m.v))
  const scale = Math.min(
    (W - 2 * PAD) / Math.max(maxU - minU, 1),
    (H - 2 * PAD) / Math.max(maxV - minV, 1),
  )
  const sx = (u: number) => W / 2 + (u - (minU + maxU) / 2) * scale
  const sy = (v: number) => H / 2 - (v - (minV + maxV) / 2) * scale
  const rect = (r: Rect) => ({
    x: sx(r.x0),
    y: sy(r.y1),
    width: (r.x1 - r.x0) * scale,
    height: (r.y1 - r.y0) * scale,
  })

  return (
    <figure className="type-preview-view">
      <figcaption>{title}</figcaption>
      <svg width={W} height={H} role="img" aria-label={title}>
        <rect width={W} height={H} fill="#fafafa" stroke="#ddd" />
        {zones.map((zone, i) => (
          <rect key={i} {...rect(zone)} fill="none" stroke="#b45309" strokeDasharray="5 4" />
        ))}
        {round ? (
          <circle
            cx={sx((body.x0 + body.x1) / 2)}
            cy={sy((body.y0 + body.y1) / 2)}
            r={((body.x1 - body.x0) / 2) * scale}
            fill="#e8eef7"
            stroke="#334155"
          />
        ) : (
          <rect {...rect(body)} fill="#e8eef7" stroke="#334155" />
        )}
        {markers.map((m) => (
          <g key={m.key}>
            {(m.du !== 0 || m.dv !== 0) && (
              <line
                x1={sx(m.u)}
                y1={sy(m.v)}
                x2={sx(m.u) + m.du * 12}
                y2={sy(m.v) - m.dv * 12}
                stroke={m.color}
                strokeWidth={3}
              />
            )}
            <circle cx={sx(m.u)} cy={sy(m.v)} r={4} fill={m.color} stroke="#fff" />
          </g>
        ))}
        <text x={W / 2} y={12} textAnchor="middle" className="preview-label">
          {topLabel}
        </text>
        <text x={W / 2} y={H - 5} textAnchor="middle" className="preview-label">
          {bottomLabel}
        </text>
      </svg>
    </figure>
  )
}

/** Live preview of an equipment type: plan view and front view with ports and clearances. */
export function TypePreview({ type, systems }: Props) {
  if (!type) {
    return <p className="muted small">Predogled se prikaže, ko vneseš mere naprave.</p>
  }
  const { width, depth } = footprintSize(type)
  const height = type.shape.height
  const hw = width / 2
  const hd = depth / 2
  const c = type.clearances ?? { front: 0, back: 0, left: 0, right: 0, top: 0 }
  const color = (systemId: string) =>
    systems.find((s) => s.id === systemId)?.color ?? UNKNOWN_SYSTEM_COLOR

  const planZones: Rect[] = []
  if (c.front) planZones.push({ x0: -hw, y0: -hd - c.front, x1: hw, y1: -hd })
  if (c.back) planZones.push({ x0: -hw, y0: hd, x1: hw, y1: hd + c.back })
  if (c.left) planZones.push({ x0: -hw - c.left, y0: -hd, x1: -hw, y1: hd })
  if (c.right) planZones.push({ x0: hw, y0: -hd, x1: hw + c.right, y1: hd })

  const frontZones: Rect[] = []
  if (c.top) frontZones.push({ x0: -hw, y0: height, x1: hw, y1: height + c.top })
  if (c.left) frontZones.push({ x0: -hw - c.left, y0: 0, x1: -hw, y1: height })
  if (c.right) frontZones.push({ x0: hw, y0: 0, x1: hw + c.right, y1: height })

  const markers = (vertical: 'y' | 'z'): Marker[] =>
    type.ports.map((port) => {
      const d = directionVector(port.direction)
      return {
        key: port.id,
        u: port.position.x,
        v: port.position[vertical],
        du: d.x,
        dv: d[vertical],
        color: color(port.systemId),
      }
    })

  return (
    <div className="type-preview">
      <Drawing
        title="Tloris"
        body={{ x0: -hw, y0: -hd, x1: hw, y1: hd }}
        round={type.shape.kind === 'cylinder'}
        zones={planZones}
        markers={markers('y')}
        topLabel="zadaj (+y)"
        bottomLabel="spredaj (−y)"
      />
      <Drawing
        title="Pogled od spredaj"
        body={{ x0: -hw, y0: 0, x1: hw, y1: height }}
        round={false}
        zones={frontZones}
        markers={markers('z')}
        topLabel="zgoraj (+z)"
        bottomLabel="spodnji rob (z = 0)"
      />
    </div>
  )
}
