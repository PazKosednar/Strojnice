import { niceLength, type View } from './viewport'

interface Props {
  view: View
  height: number
}

const format = (mm: number) => (mm >= 1000 ? `${mm / 1000} m` : `${mm} mm`)

/** Scale bar in the bottom-left corner. */
export function ScaleBar({ view, height }: Props) {
  const mm = niceLength(view.scale, 150)
  const px = mm * view.scale
  const y = height - 20
  return (
    <g className="scale-bar" pointerEvents="none">
      <rect x={10} y={y - 18} width={px + 20} height={28} fill="#ffffffcc" rx={3} />
      <path
        d={`M 20 ${y - 5} V ${y} H ${20 + px} V ${y - 5}`}
        fill="none"
        stroke="#111827"
        strokeWidth={2}
      />
      <text x={20 + px / 2} y={y - 8} textAnchor="middle">
        {format(mm)}
      </text>
    </g>
  )
}
