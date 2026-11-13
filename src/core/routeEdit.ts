import { simplifyRoute } from './routing/routeGeometry'
import { setPipeRoute } from './pipeOps'
import type { Point3, RoutePoint, Scene } from './scene'
import { fail, type SceneResult } from './sceneResult'

export type Axis = 'x' | 'y' | 'z'

/** Axis along which a segment runs, or null for a zero-length segment. */
export function segmentAxis(a: Point3, b: Point3): Axis | null {
  if (a.x !== b.x) return 'x'
  if (a.y !== b.y) return 'y'
  if (a.z !== b.z) return 'z'
  return null
}

const shift = (p: Point3, axis: Axis, delta: number): RoutePoint => ({
  ...p,
  [axis]: p[axis] + delta,
})

/**
 * Moves segment `index` (from point index to index + 1) by `delta` mm along `axis`, which
 * must be perpendicular to the segment. Neighbouring segments that run along `axis` simply
 * get longer or shorter; elsewhere a short connecting segment is inserted, so the route
 * stays axis-parallel. The two end points (connections) never move: moving the first or
 * last segment inserts a jog next to the connection. Returns null for invalid input.
 */
export function moveSegment(
  route: readonly RoutePoint[],
  index: number,
  axis: Axis,
  delta: number,
): RoutePoint[] | null {
  const a = route[index]
  const b = route[index + 1]
  if (!a || !b || !Number.isInteger(delta)) return null
  const own = segmentAxis(a, b)
  if (!own || own === axis) return null
  if (delta === 0) return [...route]

  const before = route.slice(0, index)
  const after = route.slice(index + 2)
  const a2 = shift(a, axis, delta)
  const b2 = shift(b, axis, delta)

  const head: RoutePoint[] = [...before]
  const prev = route[index - 1]
  if (prev && index > 0 && segmentAxis(prev, a) === axis) head.push(a2)
  else head.push(a, a2)

  const tail: RoutePoint[] = []
  const next = route[index + 2]
  if (next && index + 2 < route.length && segmentAxis(b, next) === axis) tail.push(b2)
  else tail.push(b2, b)

  return simplifyRoute([...head, ...tail, ...after])
}

/**
 * Splits segment `index` at `point` (rounded onto the segment), so part of it can be moved
 * on its own. The new corner stays until the route is next simplified.
 */
export function insertVertex(
  route: readonly RoutePoint[],
  index: number,
  point: Point3,
): RoutePoint[] | null {
  const a = route[index]
  const b = route[index + 1]
  if (!a || !b) return null
  const axis = segmentAxis(a, b)
  if (!axis) return null
  const lo = Math.min(a[axis], b[axis])
  const hi = Math.max(a[axis], b[axis])
  const value = Math.round(point[axis])
  if (value <= lo || value >= hi) return null
  const split = { ...a, [axis]: value }
  return [...route.slice(0, index + 1), split, ...route.slice(index + 1)]
}

/**
 * Removes the corner at `index` (not the end points). A corner between two perpendicular
 * segments is replaced by the opposite corner of their rectangle, so the route stays
 * axis-parallel and still connects its neighbours.
 */
export function removeVertex(route: readonly RoutePoint[], index: number): RoutePoint[] | null {
  if (index <= 0 || index >= route.length - 1) return null
  const prev = route[index - 1]!
  const p = route[index]!
  const next = route[index + 1]!
  const first = segmentAxis(prev, p)
  const second = segmentAxis(p, next)
  if (!first || !second || first === second) {
    return simplifyRoute([...route.slice(0, index), ...route.slice(index + 1)])
  }
  const opposite: RoutePoint = {
    x: prev.x + next.x - p.x,
    y: prev.y + next.y - p.y,
    z: prev.z + next.z - p.z,
  }
  return simplifyRoute([...route.slice(0, index), opposite, ...route.slice(index + 1)])
}

/** Sets the height of a horizontal segment (neighbouring vertical runs adapt). */
export function setSegmentHeight(
  route: readonly RoutePoint[],
  index: number,
  z: number,
): RoutePoint[] | null {
  const a = route[index]
  const b = route[index + 1]
  if (!a || !b || a.z !== b.z || !Number.isInteger(z)) return null
  return moveSegment(route, index, 'z', z - a.z)
}

/**
 * Applies a manual route edit to a pipe. The first manual edit switches the pipe to
 * 'manual', so it is never re-routed automatically.
 */
export function editPipeRoute(
  scene: Scene,
  pipeId: string,
  edit: (route: readonly RoutePoint[]) => RoutePoint[] | null,
): SceneResult {
  const pipe = scene.pipes.find((p) => p.id === pipeId)
  if (!pipe) return fail('notFound')
  const route = edit(pipe.route)
  if (!route) return fail('invalidRoute')
  return setPipeRoute(scene, pipeId, { route, mode: 'manual' })
}

/** Marks a pipe automatic again and clears its route, so it is routed afresh. */
export function requestAutoRoute(scene: Scene, pipeId: string): SceneResult {
  return setPipeRoute(scene, pipeId, { route: [], mode: 'auto' })
}
