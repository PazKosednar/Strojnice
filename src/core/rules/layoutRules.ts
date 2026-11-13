import { routeStats, wallCrossings } from '../routing/routeGeometry'
import type { CrossingElement, Point3, RoutingRule, Scene } from '../scene'
import { wallDirection } from '../wallGeometry'
import { roundPoint, segmentsOutsidePortStubs, type Segment } from './geometry'
import { appliesTo } from './ruleStatus'
import { violationBase, type RuleViolation } from './violation'

type VerticalOrder = Extract<RoutingRule, { kind: 'verticalOrder' }>
type HeightRange = Extract<RoutingRule, { kind: 'heightRange' }>
type NoCrossing = Extract<RoutingRule, { kind: 'noCrossing' }>
type MaxBends = Extract<RoutingRule, { kind: 'maxBends' }>

const routed = (scene: Scene) => scene.pipes.filter((p) => p.route.length >= 2)

const horizontal = (s: Segment) => s.a.z === s.b.z
/** 'x' or 'y' for a horizontal segment. */
const runAxis = (s: Segment) => (s.a.x !== s.b.x ? 'x' : 'y')

/**
 * Where horizontal runs of the upper and the lower system run side by side (same direction,
 * overlapping along it, axes at most `parallelWithin` apart in plan), the upper one must be
 * higher. One violation per pipe pair, where the upper one is lowest relative to the other.
 */
export function checkVerticalOrder(scene: Scene, rule: VerticalOrder): RuleViolation[] {
  const within = rule.parallelWithin ?? 0
  const pipes = routed(scene)
  const uppers = pipes.filter((p) => p.systemId === rule.upper)
  const lowers = pipes.filter((p) => p.systemId === rule.lower)
  const out: RuleViolation[] = []
  for (const u of uppers) {
    const segsU = segmentsOutsidePortStubs(scene, u).filter(horizontal)
    for (const l of lowers) {
      if (l.id === u.id) continue
      const segsL = segmentsOutsidePortStubs(scene, l).filter(horizontal)
      let worst: { diff: number; point: Point3 } | null = null
      for (const s of segsU) {
        for (const t of segsL) {
          const axis = runAxis(s)
          if (runAxis(t) !== axis) continue
          const across = axis === 'x' ? 'y' : 'x'
          const lo = Math.max(Math.min(s.a[axis], s.b[axis]), Math.min(t.a[axis], t.b[axis]))
          const hi = Math.min(Math.max(s.a[axis], s.b[axis]), Math.max(t.a[axis], t.b[axis]))
          if (hi <= lo) continue
          if (Math.abs(s.a[across] - t.a[across]) > within) continue
          const diff = s.a.z - t.a.z
          if (!worst || diff < worst.diff) {
            const point = { ...s.a, [axis]: (lo + hi) / 2 }
            worst = { diff, point }
          }
        }
      }
      if (worst && worst.diff <= 0) {
        out.push({
          ...violationBase(rule),
          pipeIds: [u.id, l.id],
          point: roundPoint(worst.point),
          measured: worst.diff,
          required: 0,
        })
      }
    }
  }
  return out
}

/** Horizontal runs of the system (outside the fixed port runs) with their axis in range. */
export function checkHeightRange(scene: Scene, rule: HeightRange): RuleViolation[] {
  const out: RuleViolation[] = []
  for (const pipe of routed(scene)) {
    if (!appliesTo(rule.systemId, pipe.systemId)) continue
    const runs = segmentsOutsidePortStubs(scene, pipe).filter(horizontal)
    const mid = (s: Segment): Point3 => ({
      x: (s.a.x + s.b.x) / 2,
      y: (s.a.y + s.b.y) / 2,
      z: s.a.z,
    })
    if (rule.min !== null) {
      const low = runs.filter((s) => s.a.z < rule.min!).sort((p, q) => p.a.z - q.a.z)[0]
      if (low) {
        out.push({
          ...violationBase(rule),
          pipeIds: [pipe.id],
          point: roundPoint(mid(low)),
          measured: low.a.z,
          required: rule.min,
          bound: 'min',
        })
      }
    }
    if (rule.max !== null) {
      const high = runs.filter((s) => s.a.z > rule.max!).sort((p, q) => q.a.z - p.a.z)[0]
      if (high) {
        out.push({
          ...violationBase(rule),
          pipeIds: [pipe.id],
          point: roundPoint(mid(high)),
          measured: high.a.z,
          required: rule.max,
          bound: 'max',
        })
      }
    }
  }
  return out
}

/** What a wall crossing passes through: a door, a window or the wall itself. */
export function crossingElement(scene: Scene, wallId: string, point: Point3): CrossingElement {
  const wall = scene.walls.find((w) => w.id === wallId)
  if (!wall) return 'wall'
  const d = wallDirection(wall)
  const u = (point.x - wall.start.x) * d.x + (point.y - wall.start.y) * d.y
  const opening = scene.openings.find(
    (o) =>
      o.wallId === wallId &&
      u > o.offset &&
      u < o.offset + o.width &&
      point.z > o.sillHeight &&
      point.z < o.sillHeight + o.height,
  )
  return opening ? opening.type : 'wall'
}

/** Every place where a pipe of the system passes through the named element. */
export function checkNoCrossing(scene: Scene, rule: NoCrossing): RuleViolation[] {
  const out: RuleViolation[] = []
  for (const pipe of routed(scene)) {
    if (!appliesTo(rule.systemId, pipe.systemId)) continue
    for (const crossing of wallCrossings(scene, pipe.route)) {
      const element = crossingElement(scene, crossing.wallId, crossing.point)
      if (element !== rule.element) continue
      out.push({
        ...violationBase(rule),
        pipeIds: [pipe.id],
        point: roundPoint(crossing.point),
        measured: 0,
        required: 0,
        crossing: { element, wallId: crossing.wallId },
      })
    }
  }
  return out
}

/** More bends than allowed; the point is the first bend over the limit. */
export function checkMaxBends(scene: Scene, rule: MaxBends): RuleViolation[] {
  const max = rule.max ?? 0
  const out: RuleViolation[] = []
  for (const pipe of routed(scene)) {
    if (!appliesTo(rule.systemId, pipe.systemId)) continue
    const { bends } = routeStats(pipe.route)
    if (bends <= max) continue
    // Simplified routes have a bend at every inner point.
    const at = pipe.route[Math.min(max + 1, pipe.route.length - 1)]!
    out.push({
      ...violationBase(rule),
      pipeIds: [pipe.id],
      point: roundPoint(at),
      measured: bends,
      required: max,
    })
  }
  return out
}
