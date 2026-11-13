import { endGeometry, resolveEnd } from './pipeEnds'
import type { Pipe, PipeEnd, Point, Point3, Scene } from './scene'

/** Nearest port or wall terminal within `tolerance` mm of a plan point, or null. */
export function findEndAt(scene: Scene, point: Point, tolerance: number): PipeEnd | null {
  let best: PipeEnd | null = null
  let bestDistance = tolerance
  const consider = (end: PipeEnd) => {
    const resolved = resolveEnd(scene, end)
    const geometry = resolved && endGeometry(scene, resolved)
    if (!geometry) return
    const d = Math.hypot(geometry.point.x - point.x, geometry.point.y - point.y)
    if (d <= bestDistance) {
      best = end
      bestDistance = d
    }
  }
  for (const e of scene.equipment) {
    for (const port of e.type.ports) consider({ kind: 'port', equipmentId: e.id, portId: port.id })
  }
  for (const t of scene.terminals) consider({ kind: 'terminal', terminalId: t.id })
  return best
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
