import { describe, expect, it } from 'vitest'
import { parseEquipmentType } from './equipmentType'
import { boxType, cylinderType } from './testFixtures'

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

function errorOf(json: unknown): string {
  const result = parseEquipmentType(json)
  if (result.ok) throw new Error('expected an error')
  return result.error
}

describe('parseEquipmentType', () => {
  it('accepts valid box and cylinder types unchanged', () => {
    expect(parseEquipmentType(clone(boxType))).toEqual({ ok: true, type: boxType })
    expect(parseEquipmentType(clone(cylinderType))).toEqual({ ok: true, type: cylinderType })
  })

  it('keeps the port size text exactly as entered', () => {
    const result = parseEquipmentType(clone(cylinderType))
    expect(result.ok && result.type.ports[0]!.size).toBe('G 3/4')
  })

  it('reads a connection key with its flow, exactly as stored', () => {
    const type = clone(boxType)
    type.ports[0] = { ...type.ports[0]!, connectionKey: 'Vitocal-Flow 1', flow: 'out' }
    const result = parseEquipmentType(type)
    expect(result.ok && result.type.ports[0]).toMatchObject({
      connectionKey: 'Vitocal-Flow 1',
      flow: 'out',
    })
  })

  it('rejects a key without a flow, a flow without a key and unknown flows', () => {
    const keyOnly = clone(boxType)
    keyOnly.ports[0] = { ...keyOnly.ports[0]!, connectionKey: 'k' }
    expect(errorOf(keyOnly)).toContain('connectionKey and flow go together')
    const flowOnly = clone(boxType)
    flowOnly.ports[0] = { ...flowOnly.ports[0]!, flow: 'in' }
    expect(errorOf(flowOnly)).toContain('connectionKey and flow go together')
    const bad = clone(boxType) as unknown as { ports: Record<string, unknown>[] }
    bad.ports[0] = { ...bad.ports[0], connectionKey: 'k', flow: 'sideways' }
    expect(errorOf(bad)).toContain('flow')
  })

  it('accepts negative port coordinates and an empty size', () => {
    const type = clone(boxType)
    type.ports[0]!.position.x = -250
    type.ports[0]!.size = ''
    expect(parseEquipmentType(type).ok).toBe(true)
  })

  it('rejects missing or non-integer dimensions', () => {
    const noHeight = clone(boxType) as { shape: Record<string, unknown> }
    delete noHeight.shape.height
    expect(errorOf(noHeight)).toBe('type.shape.height: expected an integer >= 1')

    const fractional = clone(cylinderType) as { shape: Record<string, unknown> }
    fractional.shape.diameter = 600.5
    expect(errorOf(fractional)).toBe('type.shape.diameter: expected an integer >= 1')
  })

  it('rejects unknown shapes, mountings and port directions', () => {
    expect(errorOf({ ...clone(boxType), shape: { kind: 'sphere' } })).toMatch(/^type.shape.kind:/)
    expect(errorOf({ ...clone(boxType), mounting: 'ceiling' })).toMatch(/^type.mounting:/)
    const type = clone(boxType) as { ports: { direction: string }[] }
    type.ports[0]!.direction = 'up'
    expect(errorOf(type)).toMatch(/^type.ports\[0\].direction:/)
  })

  it('rejects duplicate port ids', () => {
    const type = clone(boxType)
    type.ports[1]!.id = 'p1'
    expect(errorOf(type)).toMatch(/duplicate id "p1"/)
  })

  it('rejects a tag prefix with spaces or an empty one', () => {
    expect(errorOf({ ...clone(boxType), tagPrefix: 'H P' })).toMatch(/^type.tagPrefix:/)
    expect(errorOf({ ...clone(boxType), tagPrefix: '' })).toMatch(/^type.tagPrefix:/)
  })

  it('rejects negative clearances and treats missing clearances as none', () => {
    const type = clone(boxType)
    type.clearances!.front = -1
    expect(errorOf(type)).toBe('type.clearances.front: expected an integer >= 0')
    const result = parseEquipmentType(clone(cylinderType))
    expect(result.ok && result.type.clearances).toBeUndefined()
  })
})
