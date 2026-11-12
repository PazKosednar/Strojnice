import type { Point3, RoutePoint, Scene } from '../scene'
import { wallDirection, wallLength } from '../wallGeometry'
import { wallExtensions } from '../wallJoins'

const same = (a: Point3, b: Point3) => a.x === b.x && a.y === b.y && a.z === b.z

/** Direction of a segment as a unit axis vector, or null for a zero-length segment. */
function axis(a: Point3, b: Point3): Point3 | null {
  const d = { x: Math.sign(b.x - a.x), y: Math.sign(b.y - a.y), z: Math.sign(b.z - a.z) }
  return d.x === 0 && d.y === 0 && d.z === 0 ? null : d
}

/**
 * Removes duplicate points and points in the middle of straight runs, so only the ends
 * and the corners (bends) remain.
 */
export function simplifyRoute(points: readonly Point3[]): RoutePoint[] {
  const deduped: Point3[] = []
  for (const p of points) {
    if (!deduped.length || !same(deduped[deduped.length - 1]!, p)) deduped.push(p)
  }
  const result: RoutePoint[] = []
  for (let i = 0; i < deduped.length; i++) {
    const p = deduped[i]!
    const prev = result[result.length - 1]
    const next = deduped[i + 1]
    if (prev && next) {
      const a = axis(prev, p)
      const b = axis(p, next)
      if (a && b && a.x === b.x && a.y === b.y && a.z === b.z) continue
    }
    result.push({ x: p.x, y: p.y, z: p.z })
  }
  return result
}

export interface RouteStats {
  /** Total centre-line length (mm). */
  length: number
  /** Number of bends (direction changes). */
  bends: number
}

export function routeStats(route: readonly Point3[]): RouteStats {
  let length = 0
  let bends = 0
  let previous: Point3 | null = null
  for (let i = 1; i < route.length; i++) {
    const a = route[i - 1]!
    const b = route[i]!
    length += Math.abs(b.x - a.x) + Math.abs(b.y - a.y) + Math.abs(b.z - a.z)
    const d = axis(a, b)
    if (!d) continue
    if (previous && (previous.x !== d.x || previous.y !== d.y || previous.z !== d.z)) bends++
    previous = d
  }
  return { length, bends }
}

/** Place where a pipe passes through a wall (penetration), for the bill of materials. */
export interface WallCrossing {
  wallId: string
  /** Index of the route segment (from point i to i + 1). */
  segment: number
  /** Middle of the part of the segment inside the wall (mm, not rounded). */
  point: Point3
}

/**
 * All wall penetrations of a route: every segment that passes through (or starts or ends
 * inside) a wall body below the wall top. Segments running along a wall inside its body
 * also count once. Works for automatic and manual routes alike.
 */
export function wallCrossings(scene: Scene, route: readonly Point3[]): WallCrossing[] {
  const extensions = wallExtensions(scene.walls)
  const crossings: WallCrossing[] = []
  for (let i = 0; i + 1 < route.length; i++) {
    const a = route[i]!
    const b = route[i + 1]!
    for (const wall of scene.walls) {
      // Clip the segment against the wall body in the wall frame (u along, v across).
      const d = wallDirection(wall)
      const ext = extensions.get(wall.id) ?? { start: 0, end: 0 }
      const frame = (p: Point3) => {
        const rx = p.x - wall.start.x
        const ry = p.y - wall.start.y
        return { u: rx * d.x + ry * d.y, v: -rx * d.y + ry * d.x, z: p.z }
      }
      const fa = frame(a)
      const fb = frame(b)
      let t0 = 0
      let t1 = 1
      const clip = (p: number, q: number, lo: number, hi: number) => {
        const delta = q - p
        if (Math.abs(delta) < 1e-9) {
          if (p <= lo || p >= hi) t0 = 2
          return
        }
        let ta = (lo - p) / delta
        let tb = (hi - p) / delta
        if (ta > tb) [ta, tb] = [tb, ta]
        t0 = Math.max(t0, ta)
        t1 = Math.min(t1, tb)
      }
      clip(fa.u, fb.u, -ext.start, wallLength(wall) + ext.end)
      clip(fa.v, fb.v, -wall.thickness / 2, wall.thickness / 2)
      clip(fa.z, fb.z, -Infinity, wall.height)
      if (t0 >= t1 || t0 > 1) continue
      const t = (t0 + t1) / 2
      crossings.push({
        wallId: wall.id,
        segment: i,
        point: { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t },
      })
    }
  }
  return crossings
}
