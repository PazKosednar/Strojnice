import type { Point3, RoutingRule, RuleKind } from '../scene'

/**
 * A place where a pipe breaks a project rule. `measured` and `required` are whole mm
 * (bends: a count). Their meaning depends on the kind:
 * - minSpacing / obstacleDistance: clear gap, at least `required`
 * - verticalOrder: height of the upper system's axis above the lower one's, must be > 0
 *   (`required` is 0)
 * - heightRange: axis height, at least / at most `required` (`bound` says which)
 * - noCrossing: no numbers (measured = required = 0)
 * - maxBends: bends, at most `required`
 */
export interface RuleViolation {
  ruleId: string
  kind: RuleKind
  /** Prohibition (true) or penalty (false); maxBends is always false. */
  hard: boolean
  source: string
  pipeIds: string[]
  /** Where it happens (whole mm, plan x/y and height z). */
  point: Point3
  measured: number
  required: number
  /** heightRange: which limit is broken. */
  bound?: 'min' | 'max'
  /** noCrossing: what is crossed, and which wall. */
  crossing?: { element: 'door' | 'window' | 'wall'; wallId: string }
  /** obstacleDistance: the obstacle. */
  obstacleId?: string
}

export function violationBase(
  rule: RoutingRule,
): Pick<RuleViolation, 'ruleId' | 'kind' | 'hard' | 'source'> {
  return {
    ruleId: rule.id,
    kind: rule.kind,
    hard: rule.kind === 'maxBends' ? false : rule.hard,
    source: rule.source,
  }
}
