import type { Point } from '../core/scene'
import { worldToScreen, type View } from './viewport'

/** World points -> SVG "x,y x,y …" string in screen pixels. */
export function toSvgPoints(view: View, points: readonly Point[]): string {
  return points
    .map((p) => {
      const s = worldToScreen(view, p)
      return `${s.x.toFixed(1)},${s.y.toFixed(1)}`
    })
    .join(' ')
}

/** Screen-space angle (degrees) of a world direction, normalised so text stays upright. */
export function uprightAngle(view: View, from: Point, to: Point): number {
  const a = worldToScreen(view, from)
  const b = worldToScreen(view, to)
  let deg = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI
  if (deg > 90) deg -= 180
  if (deg <= -90) deg += 180
  return deg
}
