import type { RoutingRule, Scene } from '../scene'
import { checkHeightRange, checkMaxBends, checkNoCrossing, checkVerticalOrder } from './layoutRules'
import { effectiveRules } from './ruleStatus'
import { checkMinSpacing, checkObstacleDistance } from './spacingRules'
import type { RuleViolation } from './violation'

function checkRule(scene: Scene, rule: RoutingRule): RuleViolation[] {
  switch (rule.kind) {
    case 'minSpacing':
      return checkMinSpacing(scene, rule)
    case 'verticalOrder':
      return checkVerticalOrder(scene, rule)
    case 'obstacleDistance':
      return checkObstacleDistance(scene, rule)
    case 'heightRange':
      return checkHeightRange(scene, rule)
    case 'noCrossing':
      return checkNoCrossing(scene, rule)
    case 'maxBends':
      return checkMaxBends(scene, rule)
  }
}

/**
 * Violations of all effective project rules by all routed pipes, manual ones included.
 * Rules without a source or values have no effect (see ruleStatus).
 */
export function checkRules(scene: Scene): RuleViolation[] {
  return effectiveRules(scene).flatMap((rule) => checkRule(scene, rule))
}
