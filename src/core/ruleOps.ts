import { MAX_COORDINATE } from './parseHelpers'
import type { RoutingRule, RuleKind, Scene } from './scene'
import { fail, ok, type SceneResult } from './sceneResult'

const okLength = (v: number | null) =>
  v === null || (Number.isInteger(v) && v >= 0 && v <= MAX_COORDINATE)
const okHeight = (v: number | null) =>
  v === null || (Number.isInteger(v) && Math.abs(v) <= MAX_COORDINATE)

/** Values are whole mm (or not entered); a height range is not upside down. */
export function isValidRule(rule: RoutingRule): boolean {
  if (rule.id === '') return false
  switch (rule.kind) {
    case 'minSpacing':
    case 'obstacleDistance':
      return okLength(rule.distance)
    case 'verticalOrder':
      return okLength(rule.parallelWithin)
    case 'heightRange':
      return (
        okHeight(rule.min) &&
        okHeight(rule.max) &&
        (rule.min === null || rule.max === null || rule.min <= rule.max)
      )
    case 'noCrossing':
      return true
    case 'maxBends':
      return okLength(rule.max)
  }
}

/**
 * New rule of a kind: no values and no source, so it has no effect until the user enters
 * them. Bends are always only a warning; the other kinds start as prohibitions.
 */
export function newRule(kind: RuleKind, id: string): RoutingRule {
  const base = { id, active: true, source: '', hard: kind !== 'maxBends' }
  switch (kind) {
    case 'minSpacing':
      return { ...base, kind, systemA: null, systemB: null, distance: null }
    case 'verticalOrder':
      return { ...base, kind, upper: null, lower: null, parallelWithin: null }
    case 'obstacleDistance':
      return { ...base, kind, systemId: null, category: 'electrical', distance: null }
    case 'heightRange':
      return { ...base, kind, systemId: null, min: null, max: null }
    case 'noCrossing':
      return { ...base, kind, systemId: null, element: 'door' }
    case 'maxBends':
      return { ...base, kind, systemId: null, max: null }
  }
}

export function addRule(scene: Scene, rule: RoutingRule): SceneResult {
  if (!isValidRule(rule) || scene.rules.some((r) => r.id === rule.id)) return fail('invalidRule')
  return ok({ ...scene, rules: [...scene.rules, rule] })
}

/** Replaces a rule (same id; the kind may not change). */
export function updateRule(scene: Scene, rule: RoutingRule): SceneResult {
  const current = scene.rules.find((r) => r.id === rule.id)
  if (!current) return fail('notFound')
  if (current.kind !== rule.kind || !isValidRule(rule)) return fail('invalidRule')
  return ok({ ...scene, rules: scene.rules.map((r) => (r.id === rule.id ? rule : r)) })
}

export function removeRule(scene: Scene, id: string): SceneResult {
  if (!scene.rules.some((r) => r.id === id)) return fail('notFound')
  return ok({ ...scene, rules: scene.rules.filter((r) => r.id !== id) })
}
