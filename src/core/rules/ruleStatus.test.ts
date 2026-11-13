import { describe, expect, it } from 'vitest'
import { effectiveDiameter } from '../pipeSize'
import { addRule, newRule, removeRule, updateRule } from '../ruleOps'
import { createEmptyScene, type RoutingRule, type RuleKind, type Scene } from '../scene'
import { updateSystem } from '../systemOps'
import { appliesTo, effectiveRules, ruleStatus } from './ruleStatus'

const KINDS: RuleKind[] = [
  'minSpacing',
  'verticalOrder',
  'obstacleDistance',
  'heightRange',
  'noCrossing',
  'maxBends',
]

describe('newRule', () => {
  it.each(KINDS)('%s starts without values and without a source', (kind) => {
    const rule = newRule(kind, 'r')
    expect(rule.source).toBe('')
    expect(ruleStatus(createEmptyScene(), rule)).toBe('noSource')
  })

  it('makes bend limits a warning and the rest prohibitions', () => {
    expect(newRule('maxBends', 'r').hard).toBe(false)
    expect(newRule('minSpacing', 'r').hard).toBe(true)
  })
})

describe('ruleStatus', () => {
  const scene = createEmptyScene()
  const spacing = (patch: Partial<RoutingRule>): RoutingRule =>
    ({ ...newRule('minSpacing', 'r'), source: 'SIST EN …', ...patch }) as RoutingRule

  it('needs active, a source and all values', () => {
    expect(ruleStatus(scene, spacing({ active: false }))).toBe('inactive')
    expect(ruleStatus(scene, spacing({ source: '  ' }))).toBe('noSource')
    expect(ruleStatus(scene, spacing({}))).toBe('missingValue')
    expect(ruleStatus(scene, spacing({ distance: 30 } as Partial<RoutingRule>))).toBe('effective')
  })

  it('reports an unknown system', () => {
    const rule = spacing({ distance: 30, systemA: 'gone' } as Partial<RoutingRule>)
    expect(ruleStatus(scene, rule)).toBe('unknownSystem')
  })

  it('needs both systems and the parallel distance for a vertical order', () => {
    const base = { ...newRule('verticalOrder', 'r'), source: 'x' } as RoutingRule
    expect(ruleStatus(scene, { ...base, upper: 'supply' } as RoutingRule)).toBe('missingValue')
    expect(
      ruleStatus(scene, {
        ...base,
        upper: 'supply',
        lower: 'return',
        parallelWithin: 300,
      } as RoutingRule),
    ).toBe('effective')
  })

  it('accepts a height range with only one limit; a crossing rule needs no value', () => {
    const range = { ...newRule('heightRange', 'r'), source: 'x', max: 2400 } as RoutingRule
    expect(ruleStatus(scene, range)).toBe('effective')
    expect(ruleStatus(scene, { ...newRule('noCrossing', 'r'), source: 'x' })).toBe('effective')
  })

  it('lists only effective rules', () => {
    const rules = [spacing({ id: 'a', distance: 30 } as Partial<RoutingRule>), spacing({ id: 'b' })]
    expect(effectiveRules({ ...scene, rules }).map((r) => r.id)).toEqual(['a'])
  })

  it('applies a rule without a system to all systems', () => {
    expect(appliesTo(null, 'cold')).toBe(true)
    expect(appliesTo('cold', 'cold')).toBe(true)
    expect(appliesTo('dhw', 'cold')).toBe(false)
  })
})

describe('ruleOps', () => {
  it('adds, updates and removes; rejects bad values and a kind change', () => {
    let scene: Scene = createEmptyScene()
    const added = addRule(scene, newRule('heightRange', 'r1'))
    if (!added.ok) throw new Error(added.error)
    scene = added.scene
    const range = scene.rules[0] as Extract<RoutingRule, { kind: 'heightRange' }>
    expect(updateRule(scene, { ...range, min: 2500, max: 2000 })).toEqual({
      ok: false,
      error: 'invalidRule',
    })
    expect(updateRule(scene, { ...newRule('maxBends', 'r1') })).toEqual({
      ok: false,
      error: 'invalidRule',
    })
    const updated = updateRule(scene, { ...range, min: 2000, max: 2500, source: 'naloga' })
    expect(updated.ok && updated.scene.rules[0]).toMatchObject({ min: 2000, max: 2500 })
    expect(addRule(scene, newRule('maxBends', 'r1'))).toEqual({ ok: false, error: 'invalidRule' })
    const removed = removeRule(scene, 'r1')
    expect(removed.ok && removed.scene.rules).toEqual([])
  })
})

describe('effectiveDiameter', () => {
  it('adds twice the insulation of the system', () => {
    const result = updateSystem(createEmptyScene(), 'cold', { insulationThickness: 9 })
    if (!result.ok) throw new Error(result.error)
    expect(effectiveDiameter(result.scene, { systemId: 'cold', outerDiameter: 22 })).toBe(40)
    expect(effectiveDiameter(result.scene, { systemId: 'supply', outerDiameter: 22 })).toBe(22)
    expect(effectiveDiameter(result.scene, { systemId: 'gone', outerDiameter: 22 })).toBe(22)
  })
})
