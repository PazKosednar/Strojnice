import { describe, expect, it } from 'vitest'
import { boxType, cylinderType } from '../core/testFixtures'
import type { Json } from './database.types'
import { rowsToCatalog } from './equipmentTypesApi'

const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Json

describe('rowsToCatalog', () => {
  it('returns valid types', () => {
    const catalog = rowsToCatalog([
      { id: boxType.id, name: boxType.name, definition: json(boxType) },
      { id: cylinderType.id, name: cylinderType.name, definition: json(cylinderType) },
    ])
    expect(catalog).toEqual({ types: [boxType, cylinderType], invalid: [] })
  })

  it('takes id and name from the row', () => {
    const catalog = rowsToCatalog([{ id: 'row-id', name: 'Row name', definition: json(boxType) }])
    expect(catalog.types[0]).toMatchObject({ id: 'row-id', name: 'Row name' })
  })

  it('reports unreadable definitions separately instead of failing', () => {
    const broken = { ...boxType, shape: { kind: 'box', width: 600 } }
    const catalog = rowsToCatalog([
      { id: 'a', name: 'Broken', definition: json(broken) },
      { id: 'b', name: 'Not an object', definition: 'text' },
      { id: cylinderType.id, name: cylinderType.name, definition: json(cylinderType) },
    ])
    expect(catalog.types).toEqual([cylinderType])
    expect(catalog.invalid).toEqual([
      { id: 'a', name: 'Broken', error: 'type.shape.depth: expected an integer >= 1' },
      { id: 'b', name: 'Not an object', error: 'type: expected an object' },
    ])
  })
})
