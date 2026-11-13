import { endGeometry, resolveEnd } from './pipeEnds'
import type { Pipe, PipeEnd, Point, Point3, Scene } from './scene'

/**
 * All ports and wall terminals within `tolerance` mm of a plan point, nearest first.
 * Several ends can share one plan position (ports above each other), so callers pick
 * among them by what makes sense (e.g. a valid pipe target).
 */
export function findEndsAt(scene: Scene, point: Point, tolerance: number): PipeEnd[] {
  const found: { end: PipeEnd; distance: number }[] = []
  const consider = (end: PipeEnd) => {
    const resolved = resolveEnd(scene, end)
    const geometry = resolved && endGeometry(scene, resolved)
    if (!geometry) return
    const distance = Math.hypot(geometry.point.x - point.x, geometry.point.y - point.y)
    if (distance <= tolerance) found.push({ end, distance })
  }
  for (const e of scene.equipment) {
    for (const port of e.type.ports) consider({ kind: 'port', equipmentId: e.id, portId: port.id })
  }
  for (const t of scene.terminals) consider({ kind: 'terminal', terminalId: t.id })
  // Stable sort: ends at the same distance keep their scene order.
  return found.sort((a, b) => a.distance - b.distance).map((f) => f.end)
}

/** Nearest port or wall terminal within `tolerance` mm of a plan point, or null. */
export function findEndAt(scene: Scene, point: Point, tolerance: number): PipeEnd | null {
  return findEndsAt(scene, point, tolerance)[0] ?? null
}

export interface PipeHit {
  pipe: Pipe
  /** Index of the segment (route point index → index + 1). */
  segment: number
}

function distanceToSegment(p: Point, a: Point3, b: Point3): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const length2 = dx * dx + dy * dy
  if (length2 === 0) return Math.hypot(p.x - a.x, p.y - a.y)
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / length2))
  return Math.hypot(p.x - (a.x + dx * t), p.y - (a.y + dy * t))
}

/**
 * Pipe segment under a plan point (within its radius plus `tolerance`). Among overlapping
 * pipes the highest segment wins, as it is drawn on top. Hidden systems are skipped.
 */
export function findPipeAt(
  scene: Scene,
  point: Point,
  tolerance: number,
  hiddenSystems: readonly string[] = [],
): PipeHit | null {
  let best: { hit: PipeHit; z: number; distance: number } | null = null
  for (const pipe of scene.pipes) {
    if (hiddenSystems.includes(pipe.systemId)) continue
    const reach = pipe.outerDiameter / 2 + tolerance
    pipe.route.forEach((a, i) => {
      const b = pipe.route[i + 1]
      if (!b) return
      const distance = distanceToSegment(point, a, b)
      if (distance > reach) return
      const z = Math.max(a.z, b.z)
      if (!best || z > best.z || (z === best.z && distance < best.distance)) {
        best = { hit: { pipe, segment: i }, z, distance }
      }
    })
  }
  return best ? (best as { hit: PipeHit }).hit : null
}

/** Route vertex of a pipe within `tolerance` of a plan point (end points excluded). */
export function findVertexAt(pipe: Pipe, point: Point, tolerance: number): number | null {
  for (let i = 1; i < pipe.route.length - 1; i++) {
    const v = pipe.route[i]!
    if (Math.hypot(v.x - point.x, v.y - point.y) <= tolerance) return i
  }
  return null
}
