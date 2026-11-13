import { coord, int, obj, oneOf, SceneFormatError, str, text } from './parseHelpers'
import { OBSTACLE_CATEGORIES } from './parseSpace'
import type { CrossingElement, RoutingRule, RuleKind } from './scene'

export const RULE_KINDS: readonly RuleKind[] = [
  'minSpacing',
  'verticalOrder',
  'obstacleDistance',
  'heightRange',
  'noCrossing',
  'maxBends',
]
export const CROSSING_ELEMENTS: readonly CrossingElement[] = ['door', 'window', 'wall']

function bool(value: unknown, path: string): boolean {
  if (typeof value !== 'boolean') throw new SceneFormatError(`${path}: expected true or false`)
  return value
}

/** A system id, or null for "all systems". */
function systemRef(value: unknown, path: string): string | null {
  return value === null ? null : str(value, path)
}

/** A value the user has not entered yet is null. */
function optional<T>(value: unknown, read: (v: unknown) => T): T | null {
  return value === null ? null : read(value)
}

/**
 * Reads a stored project rule. Unknown system ids are kept (the rule then has no effect
 * and the rules panel says why), so deleting a system never makes a project unreadable.
 */
export function readRule(value: unknown, path: string): RoutingRule {
  const o = obj(value, path)
  const base = {
    id: str(o.id, `${path}.id`),
    active: bool(o.active, `${path}.active`),
    source: text(o.source, `${path}.source`),
    hard: bool(o.hard, `${path}.hard`),
  }
  const kind = oneOf(o.kind, `${path}.kind`, RULE_KINDS)
  const length = (key: string) => optional(o[key], (v) => int(v, `${path}.${key}`, 0))
  switch (kind) {
    case 'minSpacing':
      return {
        ...base,
        kind,
        systemA: systemRef(o.systemA, `${path}.systemA`),
        systemB: systemRef(o.systemB, `${path}.systemB`),
        distance: length('distance'),
      }
    case 'verticalOrder':
      return {
        ...base,
        kind,
        upper: systemRef(o.upper, `${path}.upper`),
        lower: systemRef(o.lower, `${path}.lower`),
        parallelWithin: length('parallelWithin'),
      }
    case 'obstacleDistance':
      return {
        ...base,
        kind,
        systemId: systemRef(o.systemId, `${path}.systemId`),
        category: oneOf(o.category, `${path}.category`, OBSTACLE_CATEGORIES),
        distance: length('distance'),
      }
    case 'heightRange': {
      const min = optional(o.min, (v) => coord(v, `${path}.min`))
      const max = optional(o.max, (v) => coord(v, `${path}.max`))
      if (min !== null && max !== null && min > max) {
        throw new SceneFormatError(`${path}: min must not be greater than max`)
      }
      return { ...base, kind, systemId: systemRef(o.systemId, `${path}.systemId`), min, max }
    }
    case 'noCrossing':
      return {
        ...base,
        kind,
        systemId: systemRef(o.systemId, `${path}.systemId`),
        element: oneOf(o.element, `${path}.element`, CROSSING_ELEMENTS),
      }
    case 'maxBends':
      return {
        ...base,
        kind,
        systemId: systemRef(o.systemId, `${path}.systemId`),
        max: length('max'),
      }
  }
}
