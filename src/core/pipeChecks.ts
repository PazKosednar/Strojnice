import { endDiameter, resolveEnd } from './pipeEnds'
import { effectiveRadius } from './pipeSize'
import { planBoxCorners } from './planBox'
import { stubOf } from './routing/stubs'
import type { Obstacle, Pipe, Point3, Scene } from './scene'
import { footprintsOverlap, rangesOverlap } from './collisions'
import { equipmentFootprint, equipmentHeight, type Footprint } from './equipmentGeometry'

const same = (a: Point3, b: Point3) => a.x === b.x && a.y === b.y && a.z === b.z

/** Where a pipe must start and end (connection points, rounded), or null if an end is gone. */
export function pipeEndPoints(scene: Scene, pipe: Pipe): { from: Point3; to: Point3 } | null {
  const from = resolveEnd(scene, pipe.from)
  const to = resolveEnd(scene, pipe.to)
  if (!from || !to) return null
  const a = stubOf(scene, from)
  const b = stubOf(scene, to)
  return a && b ? { from: a.point, to: b.point } : null
}

/** True when the stored route no longer starts and ends at the pipe's connection points. */
export function routeDisconnected(scene: Scene, pipe: Pipe): boolean {
  if (pipe.route.length < 2) return false
  const ends = pipeEndPoints(scene, pipe)
  if (!ends) return true
  return !same(pipe.route[0]!, ends.from) || !same(pipe.route[pipe.route.length - 1]!, ends.to)
}

/** True when the diameters at the two ends differ (or the pipe differs from an end). */
export function diameterMismatch(scene: Scene, pipe: Pipe): boolean {
  const from = resolveEnd(scene, pipe.from)
  const to = resolveEnd(scene, pipe.to)
  if (!from || !to) return false
  const a = endDiameter(from)
  const b = endDiameter(to)
  return a !== b || a !== pipe.outerDiameter
}

interface SegmentBox {
  x0: number
  x1: number
  y0: number
  y1: number
  z0: number
  z1: number
}

function segmentBoxes(scene: Scene, pipe: Pipe, skipEnds: boolean): SegmentBox[] {
  const r = effectiveRadius(scene, pipe)
  const boxes: SegmentBox[] = []
  const last = pipe.route.length - 2
  pipe.route.forEach((p, i) => {
    const q = pipe.route[i + 1]
    if (!q) return
    // The first and last segments touch the equipment the pipe is connected to.
    if (skipEnds && (i === 0 || i === last)) return
    boxes.push({
      x0: Math.min(p.x, q.x) - r,
      x1: Math.max(p.x, q.x) + r,
      y0: Math.min(p.y, q.y) - r,
      y1: Math.max(p.y, q.y) + r,
      z0: Math.min(p.z, q.z) - r,
      z1: Math.max(p.z, q.z) + r,
    })
  })
  return boxes
}

const boxFootprint = (b: SegmentBox): Footprint => ({
  kind: 'polygon',
  points: [
    { x: b.x0, y: b.y0 },
    { x: b.x1, y: b.y0 },
    { x: b.x1, y: b.y1 },
    { x: b.x0, y: b.y1 },
  ],
})

const boxesOverlap = (a: SegmentBox, b: SegmentBox) =>
  a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1 && a.z0 < b.z1 && b.z0 < a.z1

const obstacleFootprint = (o: Obstacle): Footprint => ({
  kind: 'polygon',
  points: planBoxCorners(o),
})

/** What a route collides with: equipment (not its own ends), obstacles and other pipes. */
export interface PipeClash {
  kind: 'equipment' | 'obstacle' | 'pipe'
  id: string
}

/**
 * Collisions of a pipe route with equipment bodies and other pipes (touching is fine).
 * Used for manual routes; automatic routes avoid these by construction.
 */
export function pipeClashes(scene: Scene, pipe: Pipe): PipeClash[] {
  const own = new Set(
    [pipe.from, pipe.to].flatMap((e) => (e.kind === 'port' ? [e.equipmentId] : [])),
  )
  const boxes = segmentBoxes(scene, pipe, true)
  const clashes: PipeClash[] = []
  for (const e of scene.equipment) {
    if (own.has(e.id)) continue
    const body = {
      footprint: equipmentFootprint(e),
      z0: e.elevation,
      z1: e.elevation + equipmentHeight(e.type),
    }
    const hit = boxes.some(
      (b) =>
        rangesOverlap(b.z0, b.z1, body.z0, body.z1) &&
        footprintsOverlap(boxFootprint(b), body.footprint, 0),
    )
    if (hit) clashes.push({ kind: 'equipment', id: e.id })
  }
  for (const o of scene.obstacles) {
    const body = { footprint: obstacleFootprint(o), z0: o.bottom, z1: o.bottom + o.height }
    const hit = boxes.some(
      (b) =>
        rangesOverlap(b.z0, b.z1, body.z0, body.z1) &&
        footprintsOverlap(boxFootprint(b), body.footprint, 0),
    )
    if (hit) clashes.push({ kind: 'obstacle', id: o.id })
  }
  for (const other of scene.pipes) {
    if (other.id === pipe.id) continue
    const others = segmentBoxes(scene, other, false)
    if (boxes.some((b) => others.some((o) => boxesOverlap(b, o)))) {
      clashes.push({ kind: 'pipe', id: other.id })
    }
  }
  return clashes
}
