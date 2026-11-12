import type { Point } from '../core/scene'
import type { SnapKind } from '../core/snap'
import { worldToScreen, type View } from './viewport'

interface Props {
  view: View
  start: Point | null
  target: Point
  snapKind: SnapKind
  typed: string
}

const SNAP_COLORS: Record<SnapKind, string> = {
  endpoint: '#16a34a',
  angle: '#ea580c',
  grid: '#6b7280',
}

/** Wall being drawn: dashed axis, live length label and the snap marker. */
export function PlanDraftPreview({ view, start, target, snapKind, typed }: Props) {
  const t = worldToScreen(view, target)
  const marker = (
    <circle cx={t.x} cy={t.y} r={5} fill="none" stroke={SNAP_COLORS[snapKind]} strokeWidth={2} />
  )
  if (!start) return marker

  const s = worldToScreen(view, start)
  const length = Math.round(Math.hypot(target.x - start.x, target.y - start.y))
  const label = typed ? `${typed} mm ↵` : `${length} mm`
  return (
    <g pointerEvents="none">
      <line
        x1={s.x}
        y1={s.y}
        x2={t.x}
        y2={t.y}
        stroke="#2563eb"
        strokeWidth={2}
        strokeDasharray="6 4"
      />
      {marker}
      <g transform={`translate(${t.x + 12} ${t.y - 12})`}>
        <rect x={-4} y={-14} width={label.length * 7.5 + 8} height={20} rx={3} fill="#1f2937" />
        <text x={0} y={0} fill="#fff" className="draft-label">
          {label}
        </text>
      </g>
    </g>
  )
}
