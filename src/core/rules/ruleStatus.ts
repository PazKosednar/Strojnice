import type { RoutingRule, Scene } from '../scene'

/** Why a rule has no effect (or 'effective'). */
export type RuleStatus = 'effective' | 'inactive' | 'noSource' | 'missingValue' | 'unknownSystem'

function systemsOf(rule: RoutingRule): (string | null)[] {
  switch (rule.kind) {
    case 'minSpacing':
      return [rule.systemA, rule.systemB]
    case 'verticalOrder':
      return [rule.upper, rule.lower]
    default:
      return [rule.systemId]
  }
}

function hasValues(rule: RoutingRule): boolean {
  switch (rule.kind) {
    case 'minSpacing':
    case 'obstacleDistance':
      return rule.distance !== null
    case 'verticalOrder':
      // Both systems are needed: "all systems" makes no sense for an order.
      return rule.upper !== null && rule.lower !== null && rule.parallelWithin !== null
    case 'heightRange':
      return rule.min !== null || rule.max !== null
    case 'noCrossing':
      return true
    case 'maxBends':
      return rule.max !== null
  }
}

/**
 * A rule takes effect only when it is switched on, names its source and has all its values,
 * and every system it names exists in the project. Nothing is filled in automatically.
 */
export function ruleStatus(scene: Scene, rule: RoutingRule): RuleStatus {
  if (!rule.active) return 'inactive'
  if (rule.source.trim() === '') return 'noSource'
  if (!hasValues(rule)) return 'missingValue'
  const known = new Set(scene.settings.systems.map((s) => s.id))
  if (systemsOf(rule).some((id) => id !== null && !known.has(id))) return 'unknownSystem'
  return 'effective'
}

/** Rules that take effect, in their stored order. */
export function effectiveRules(scene: Scene): RoutingRule[] {
  return scene.rules.filter((rule) => ruleStatus(scene, rule) === 'effective')
}

/** True when the rule applies to pipes of this system (null = all systems). */
export function appliesTo(ruleSystem: string | null, systemId: string): boolean {
  return ruleSystem === null || ruleSystem === systemId
}
