import type { Footprint } from './equipmentGeometry'
import type { Point } from './scene'

/**
 * Shapes that merely touch, or overlap by no more than this many mm, do not collide.
 * It absorbs integer rounding of positions (equipment set against a wall face).
 */
export const TOUCH_TOLERANCE = 1

/** Solid in the scene: a plan footprint extruded between two heights. */
export interface Body {
  footprint: Footprint
  z0: number
  z1: number
}

function normalize(v: Point): Point | null {
  const length = Math.hypot(v.x, v.y)
  return length < 1e-9 ? null : { x: v.x / length, y: v.y / length }
}

function edgeNormals(points: readonly Point[]): Point[] {
  const axes: Point[] = []
  for (let i = 0; i < points.length; i++) {
    const a = points[i]!
    const b = points[(i + 1) % points.length]!
    const n = normalize({ x: -(b.y - a.y), y: b.x - a.x })
    if (n) axes.push(n)
  }
  return axes
}

function nearestVertexAxis(center: Point, points: readonly Point[]): Point | null {
  let best: Point | null = null
  let bestDistance = Infinity
  for (const p of points) {
    const distance = Math.hypot(p.x - center.x, p.y - center.y)
    if (distance < bestDistance) {
      best = p
      bestDistance = distance
    }
  }
  return best ? normalize({ x: best.x - center.x, y: best.y - center.y }) : null
}

function project(shape: Footprint, axis: Point): [number, number] {
  if (shape.kind === 'circle') {
    const c = shape.center.x * axis.x + shape.center.y * axis.y
    return [c - shape.radius, c + shape.radius]
  }
  let min = Infinity
  let max = -Infinity
  for (const p of shape.points) {
    const v = p.x * axis.x + p.y * axis.y
    min = Math.min(min, v)
    max = Math.max(max, v)
  }
  return [min, max]
}

function separatingAxes(a: Footprint, b: Footprint): Point[] {
  const axes: Point[] = []
  if (a.kind === 'polygon') axes.push(...edgeNormals(a.points))
  if (b.kind === 'polygon') axes.push(...edgeNormals(b.points))
  let extra: Point | null = null
  if (a.kind === 'circle' && b.kind === 'polygon') extra = nearestVertexAxis(a.center, b.points)
  if (b.kind === 'circle' && a.kind === 'polygon') extra = nearestVertexAxis(b.center, a.points)
  if (a.kind === 'circle' && b.kind === 'circle') {
    extra = normalize({ x: b.center.x - a.center.x, y: b.center.y - a.center.y }) ?? { x: 1, y: 0 }
  }
  if (extra) axes.push(extra)
  return axes
}

/**
 * True when two plan footprints (convex polygons or circles) overlap by more than
 * `tolerance` mm (separating-axis test).
 */
export function footprintsOverlap(
  a: Footprint,
  b: Footprint,
  tolerance = TOUCH_TOLERANCE,
): boolean {
  for (const axis of separatingAxes(a, b)) {
    const [minA, maxA] = project(a, axis)
    const [minB, maxB] = project(b, axis)
    if (Math.min(maxA, maxB) - Math.max(minA, minB) <= tolerance) return false
  }
  return true
}

/** True when two height ranges overlap (touching ranges do not). */
export function rangesOverlap(a0: number, a1: number, b0: number, b1: number): boolean {
  return a0 < b1 && b0 < a1
}

/** True when two bodies intersect: footprints overlap and so do their height ranges. */
export function bodiesCollide(a: Body, b: Body, tolerance = TOUCH_TOLERANCE): boolean {
  return (
    rangesOverlap(a.z0, a.z1, b.z0, b.z1) && footprintsOverlap(a.footprint, b.footprint, tolerance)
  )
}
