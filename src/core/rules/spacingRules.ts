import { effectiveRadius } from '../pipeSize'
import type { Pipe, RoutingRule, Scene } from '../scene'
import { routeSegments, roundPoint, segmentBoxDistance, segmentDistance } from './geometry'
import { segmentsOutsidePortStubs } from './geometry'
import { appliesTo } from './ruleStatus'
import { violationBase, type RuleViolation } from './violation'

type MinSpacing = Extract<RoutingRule, { kind: 'minSpacing' }>
type ObstacleDistance = Extract<RoutingRule, { kind: 'obstacleDistance' }>

const routed = (scene: Scene) => scene.pipes.filter((p) => p.route.length >= 2)

function pairMatches(rule: MinSpacing, a: Pipe, b: Pipe): boolean {
  return (
    (appliesTo(rule.systemA, a.systemId) && appliesTo(rule.systemB, b.systemId)) ||
    (appliesTo(rule.systemA, b.systemId) && appliesTo(rule.systemB, a.systemId))
  )
}

/**
 * Clear gap between the surfaces (incl. insulation) of two pipes of the named systems,
 * outside the fixed straight runs at ports. One violation per pipe pair, at the closest place.
 */
export function checkMinSpacing(scene: Scene, rule: MinSpacing): RuleViolation[] {
  const required = rule.distance ?? 0
  const pipes = routed(scene)
  const out: RuleViolation[] = []
  pipes.forEach((a, i) => {
    const segsA = segmentsOutsidePortStubs(scene, a)
    for (const b of pipes.slice(i + 1)) {
      if (!pairMatches(rule, a, b)) continue
      const segsB = segmentsOutsidePortStubs(scene, b)
      const radii = effectiveRadius(scene, a) + effectiveRadius(scene, b)
      let worst: { gap: number; point: RuleViolation['point'] } | null = null
      for (const s of segsA) {
        for (const t of segsB) {
          const { distance, point } = segmentDistance(s, t)
          const gap = distance - radii
          if (!worst || gap < worst.gap) worst = { gap, point }
        }
      }
      if (worst && worst.gap < required) {
        out.push({
          ...violationBase(rule),
          pipeIds: [a.id, b.id],
          point: roundPoint(worst.point),
          measured: Math.max(0, Math.floor(worst.gap)),
          required,
        })
      }
    }
  })
  return out
}

/** Clear gap between a pipe surface (incl. insulation) and obstacles of a category. */
export function checkObstacleDistance(scene: Scene, rule: ObstacleDistance): RuleViolation[] {
  const required = rule.distance ?? 0
  const obstacles = scene.obstacles.filter((o) => o.category === rule.category)
  const out: RuleViolation[] = []
  for (const pipe of routed(scene)) {
    if (!appliesTo(rule.systemId, pipe.systemId)) continue
    const radius = effectiveRadius(scene, pipe)
    const segments = routeSegments(pipe.route)
    for (const obstacle of obstacles) {
      let worst: { gap: number; point: RuleViolation['point'] } | null = null
      for (const s of segments) {
        const { distance, point } = segmentBoxDistance(s, obstacle)
        const gap = distance - radius
        if (!worst || gap < worst.gap) worst = { gap, point }
      }
      if (worst && worst.gap < required) {
        out.push({
          ...violationBase(rule),
          pipeIds: [pipe.id],
          point: roundPoint(worst.point),
          measured: Math.max(0, Math.floor(worst.gap)),
          required,
          obstacleId: obstacle.id,
        })
      }
    }
  }
  return out
}
