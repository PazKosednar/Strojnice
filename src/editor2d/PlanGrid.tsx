import { displayGridStep, worldToScreen, type View } from './viewport'

interface Props {
  view: View
  width: number
  height: number
  gridSize: number
}

const mod = (a: number, n: number) => ((a % n) + n) % n

/** Background grid (snap grid, coarsened when zoomed out) with the origin axes. */
export function PlanGrid({ view, width, height, gridSize }: Props) {
  const step = displayGridStep(gridSize, view.scale) * view.scale
  const major = step * 5
  const origin = worldToScreen(view, { x: 0, y: 0 })
  return (
    <g aria-hidden="true">
      <defs>
        <pattern
          id="grid-minor"
          width={step}
          height={step}
          patternUnits="userSpaceOnUse"
          x={mod(origin.x, step)}
          y={mod(origin.y, step)}
        >
          <path d={`M ${step} 0 L 0 0 0 ${step}`} fill="none" stroke="#eceff3" strokeWidth={1} />
        </pattern>
        <pattern
          id="grid-major"
          width={major}
          height={major}
          patternUnits="userSpaceOnUse"
          x={mod(origin.x, major)}
          y={mod(origin.y, major)}
        >
          <rect width={major} height={major} fill="url(#grid-minor)" />
          <path d={`M ${major} 0 L 0 0 0 ${major}`} fill="none" stroke="#d9dee5" strokeWidth={1} />
        </pattern>
      </defs>
      <rect width={width} height={height} fill="url(#grid-major)" />
      <line x1={origin.x} y1={0} x2={origin.x} y2={height} stroke="#c3cad4" />
      <line x1={0} y1={origin.y} x2={width} y2={origin.y} stroke="#c3cad4" />
    </g>
  )
}
