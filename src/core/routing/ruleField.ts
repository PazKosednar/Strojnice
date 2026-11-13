import { appliesTo, effectiveRules } from '../rules/ruleStatus'
import type { ObstacleCategory, RoutingRule, Scene } from '../scene'

/** A distance required by a prohibition (hard) and by a penalty (soft); null = none. */
export interface Requirement {
  hard: number | null
  soft: number | null
}

const larger = (a: number | null, b: number | null) =>
  a === null ? b : b === null ? a : Math.max(a, b)

function add(req: Requirement, rule: RoutingRule, value: number | null): Requirement {
  return rule.hard
    ? { ...req, hard: larger(req.hard, value) }
    : { ...req, soft: larger(req.soft, value) }
}

/**
 * Effective rules as the router needs them for one pipe of `systemId`. Only rules that
 * take effect (active, with a source and values) are used.
 */
export interface RouteRules {
  /** Clear gap required to a pipe of the other system. */
  spacingTo(otherSystemId: string): Requirement
  /** Clear gap required to obstacles of a category. */
  obstacleDistance(category: ObstacleCategory): Requirement
  /** Allowed axis heights of horizontal runs. */
  heightRanges: { min: number | null; max: number | null; hard: boolean }[]
  /** Vertical order against pipes of another system. */
  orders: { otherSystemId: string; above: boolean; within: number; hard: boolean }[]
  /** Passing through a wall body: allowed, blocked or penalised. */
  wallCrossing: 'allowed' | 'blocked' | 'penalized'
}

export function routeRules(scene: Scene, systemId: string | undefined): RouteRules {
  const rules = systemId === undefined ? [] : effectiveRules(scene)
  const sys = systemId ?? ''
  const heightRanges: RouteRules['heightRanges'] = []
  const orders: RouteRules['orders'] = []
  let wallCrossing: RouteRules['wallCrossing'] = 'allowed'
  for (const rule of rules) {
    if (rule.kind === 'heightRange' && appliesTo(rule.systemId, sys)) {
      heightRanges.push({ min: rule.min, max: rule.max, hard: rule.hard })
    } else if (rule.kind === 'verticalOrder' && rule.parallelWithin !== null) {
      if (rule.upper === sys && rule.lower !== null && rule.lower !== sys) {
        orders.push({
          otherSystemId: rule.lower,
          above: true,
          within: rule.parallelWithin,
          hard: rule.hard,
        })
      } else if (rule.lower === sys && rule.upper !== null && rule.upper !== sys) {
        orders.push({
          otherSystemId: rule.upper,
          above: false,
          within: rule.parallelWithin,
          hard: rule.hard,
        })
      }
    } else if (
      rule.kind === 'noCrossing' &&
      rule.element === 'wall' &&
      appliesTo(rule.systemId, sys)
    ) {
      if (rule.hard) wallCrossing = 'blocked'
      else if (wallCrossing === 'allowed') wallCrossing = 'penalized'
    }
  }
  return {
    spacingTo(other) {
      let req: Requirement = { hard: null, soft: null }
      for (const rule of rules) {
        if (rule.kind !== 'minSpacing') continue
        const matches =
          (appliesTo(rule.systemA, sys) && appliesTo(rule.systemB, other)) ||
          (appliesTo(rule.systemA, other) && appliesTo(rule.systemB, sys))
        if (matches) req = add(req, rule, rule.distance)
      }
      return req
    },
    obstacleDistance(category) {
      let req: Requirement = { hard: null, soft: null }
      for (const rule of rules) {
        if (rule.kind !== 'obstacleDistance' || rule.category !== category) continue
        if (appliesTo(rule.systemId, sys)) req = add(req, rule, rule.distance)
      }
      return req
    },
    heightRanges,
    orders,
    wallCrossing,
  }
}
