import { rotationTrig } from '../equipmentGeometry'
import type { Pipe, PlanBox, Point3, Scene } from '../scene'

/** Straight piece of a route; `index` is the route segment it belongs to. */
export interface Segment {
  a: Point3
  b: Point3
  index: number
}

export function routeSegments(route: readonly Point3[]): Segment[] {
  const segments: Segment[] = []
  for (let i = 0; i + 1 < route.length; i++) {
    segments.push({ a: route[i]!, b: route[i + 1]!, index: i })
  }
  return segments
}

const length = (s: { a: Point3; b: Point3 }) =>
  Math.abs(s.b.x - s.a.x) + Math.abs(s.b.y - s.a.y) + Math.abs(s.b.z - s.a.z)

/** Point at `distance` mm from `a` towards `b` (axis-parallel segment). */
function along(a: Point3, b: Point3, distance: number): Point3 {
  const total = length({ a, b })
  const t = total === 0 ? 0 : Math.min(1, distance / total)
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t }
}

/**
 * Segments of a pipe without the straight runs out of its ports (`portStraight`). Those runs
 * are fixed by the manufacturer's connection positions, so spacing rules do not apply there.
 */
export function segmentsOutsidePortStubs(scene: Scene, pipe: Pipe): Segment[] {
  const stub = scene.settings.portStraight
  const segments = routeSegments(pipe.route)
  if (segments.length === 0) return segments
  const trimStart = pipe.from.kind === 'port' ? stub : 0
  const trimEnd = pipe.to.kind === 'port' ? stub : 0
  const first = segments[0]!
  const last = segments[segments.length - 1]!
  const out: Segment[] = []
  for (const s of segments) {
    let { a, b } = s
    if (s === first && trimStart > 0) a = along(a, b, Math.min(trimStart, length(s)))
    if (s === last && trimEnd > 0) b = along(b, a, Math.min(trimEnd, length({ a, b })))
    if (length({ a, b }) > 0) out.push({ a, b, index: s.index })
  }
  return out
}

/** The straight runs out of the pipe's ports (the parts segmentsOutsidePortStubs drops). */
export function portStubSegments(scene: Scene, pipe: Pipe): Segment[] {
  const stub = scene.settings.portStraight
  const segments = routeSegments(pipe.route)
  if (segments.length === 0 || stub <= 0) return []
  const out: Segment[] = []
  const first = segments[0]!
  const last = segments[segments.length - 1]!
  if (pipe.from.kind === 'port') {
    out.push({ a: first.a, b: along(first.a, first.b, stub), index: first.index })
  }
  if (pipe.to.kind === 'port') {
    out.push({ a: along(last.b, last.a, stub), b: last.b, index: last.index })
  }
  return out
}

interface Interval {
  lo: number
  hi: number
}

const interval = (p: number, q: number): Interval => ({ lo: Math.min(p, q), hi: Math.max(p, q) })

/** Gap between two intervals (0 when they overlap) and a coordinate of `a` nearest to `b`. */
function axisGap(a: Interval, b: Interval): { gap: number; at: number } {
  if (a.hi < b.lo) return { gap: b.lo - a.hi, at: a.hi }
  if (b.hi < a.lo) return { gap: a.lo - b.hi, at: a.lo }
  const lo = Math.max(a.lo, b.lo)
  const hi = Math.min(a.hi, b.hi)
  return { gap: 0, at: (lo + hi) / 2 }
}

/**
 * Shortest distance between the centre lines of two axis-parallel segments (exact: such
 * segments are degenerate axis-aligned boxes) and the point on `s` where it occurs.
 */
export function segmentDistance(s: Segment, t: Segment): { distance: number; point: Point3 } {
  const x = axisGap(interval(s.a.x, s.b.x), interval(t.a.x, t.b.x))
  const y = axisGap(interval(s.a.y, s.b.y), interval(t.a.y, t.b.y))
  const z = axisGap(interval(s.a.z, s.b.z), interval(t.a.z, t.b.z))
  return { distance: Math.hypot(x.gap, y.gap, z.gap), point: { x: x.at, y: y.at, z: z.at } }
}

/** Distance from a point to an upright (possibly rotated) box; 0 inside. */
export function pointBoxDistance(p: Point3, box: PlanBox): number {
  const { cos, sin } = rotationTrig(box.rotation)
  const dx = p.x - box.center.x
  const dy = p.y - box.center.y
  // Rotate into the box frame (inverse rotation).
  const lx = dx * cos + dy * sin
  const ly = -dx * sin + dy * cos
  const gx = Math.max(Math.abs(lx) - box.width / 2, 0)
  const gy = Math.max(Math.abs(ly) - box.depth / 2, 0)
  const gz = Math.max(box.bottom - p.z, p.z - (box.bottom + box.height), 0)
  return Math.hypot(gx, gy, gz)
}

/**
 * Shortest distance from a segment to a box and where on the segment it occurs. The
 * distance to a convex body is convex along the segment, so a ternary search is exact to
 * well below a millimetre. Where the distance is the same over a stretch (a pipe running
 * along the box), the middle of that stretch is reported.
 */
export function segmentBoxDistance(s: Segment, box: PlanBox): { distance: number; point: Point3 } {
  const at = (t: number): Point3 => ({
    x: s.a.x + (s.b.x - s.a.x) * t,
    y: s.a.y + (s.b.y - s.a.y) * t,
    z: s.a.z + (s.b.z - s.a.z) * t,
  })
  const f = (t: number) => pointBoxDistance(at(t), box)
  let lo = 0
  let hi = 1
  for (let i = 0; i < 80; i++) {
    const m1 = lo + (hi - lo) / 3
    const m2 = hi - (hi - lo) / 3
    if (f(m1) <= f(m2)) hi = m2
    else lo = m1
  }
  const best = (lo + hi) / 2
  const distance = f(best)
  // Ends of the stretch within 0.01 mm of the minimum (convex: decreasing, then increasing).
  const near = (t: number) => f(t) <= distance + 0.01
  let a0 = 0
  let a1 = best
  let b0 = best
  let b1 = 1
  for (let i = 0; i < 60; i++) {
    const ma = (a0 + a1) / 2
    if (near(ma)) a1 = ma
    else a0 = ma
    const mb = (b0 + b1) / 2
    if (near(mb)) b0 = mb
    else b1 = mb
  }
  const start = near(0) ? 0 : a1
  const end = near(1) ? 1 : b0
  return { distance, point: at((start + end) / 2) }
}

/** Rounds a point to whole mm (for reporting). */
export const roundPoint = (p: Point3): Point3 => ({
  x: Math.round(p.x) + 0,
  y: Math.round(p.y) + 0,
  z: Math.round(p.z) + 0,
})
