import { describe, expect, it } from 'vitest'
import { parseEquipmentType } from '../core/equipmentType'
import { boxType, cylinderType } from '../core/testFixtures'
import { EQUIPMENT_TEMPLATES } from './templates'
import {
  draftFromTemplate,
  draftFromType,
  draftToType,
  emptyPortDraft,
  previewType,
} from './typeDraft'

const template = (key: string) => EQUIPMENT_TEMPLATES.find((t) => t.key === key)!

describe('templates', () => {
  it('define only shape, prefix and mounting', () => {
    for (const t of EQUIPMENT_TEMPLATES) {
      expect(Object.keys(t).sort()).toEqual(['key', 'label', 'mounting', 'shapeKind', 'tagPrefix'])
    }
    expect(EQUIPMENT_TEMPLATES.map((t) => t.tagPrefix)).toEqual([
      'HP',
      'IDU',
      'CYL',
      'EV',
      'MF',
      'EQ',
    ])
  })
})

describe('draftFromTemplate', () => {
  it('leaves every dimension empty and has no ports or clearances', () => {
    const draft = draftFromTemplate(template('cylinder'), 'id-1')
    expect(draft).toMatchObject({
      id: 'id-1',
      name: 'Hranilnik',
      tagPrefix: 'CYL',
      shapeKind: 'cylinder',
      mounting: 'floor',
      width: '',
      depth: '',
      diameter: '',
      height: '',
      ports: [],
    })
    expect(Object.values(draft.clearances).every((v) => v === '')).toBe(true)
  })

  it('cannot be saved until the dimensions are entered', () => {
    const result = draftToType(draftFromTemplate(template('indoor'), 'id-1'))
    expect(result.ok).toBe(false)
    expect(!result.ok && Object.keys(result.errors).sort()).toEqual(['depth', 'height', 'width'])
  })
})

describe('draftToType', () => {
  it('round-trips existing types through the form', () => {
    expect(draftToType(draftFromType(boxType))).toEqual({ ok: true, type: boxType })
    expect(draftToType(draftFromType(cylinderType))).toEqual({ ok: true, type: cylinderType })
  })

  it('builds a type that passes core validation', () => {
    const draft = draftFromTemplate(template('cylinder'), 'id-1')
    draft.diameter = '650'
    draft.height = '1800'
    draft.ports = [
      {
        ...emptyPortDraft('p1', 'dhw'),
        name: 'Topla voda',
        x: '0',
        y: '-325',
        z: '1500',
        size: 'G 1',
      },
    ]
    const result = draftToType(draft)
    if (!result.ok) throw new Error(JSON.stringify(result.errors))
    expect(result.type.shape).toEqual({ kind: 'cylinder', diameter: 650, height: 1800 })
    expect(result.type.clearances).toBeUndefined()
    expect(result.type.ports[0]).toMatchObject({
      size: 'G 1',
      position: { x: 0, y: -325, z: 1500 },
    })
    expect(parseEquipmentType(JSON.parse(JSON.stringify(result.type))).ok).toBe(true)
  })

  it('treats empty clearances as 0 and keeps them only when one is set', () => {
    const draft = draftFromType(cylinderType)
    draft.clearances.front = '600'
    const result = draftToType(draft)
    expect(result.ok && result.type.clearances).toEqual({
      front: 600,
      back: 0,
      left: 0,
      right: 0,
      top: 0,
    })
  })

  it('reports each invalid field with a Slovenian message', () => {
    const draft = draftFromType(boxType)
    draft.name = '  '
    draft.tagPrefix = 'I D U'
    draft.width = '60.5'
    draft.clearances.top = '-5'
    draft.ports[0]!.name = ''
    draft.ports[1]!.z = 'abc'
    const result = draftToType(draft)
    expect(!result.ok && result.errors).toEqual({
      name: 'Vnesi ime tipa.',
      tagPrefix: 'Vnesi predpono oznake (brez presledkov, največ 12 znakov).',
      width: 'Vnesi mero v mm (celo število, večje od 0).',
      'clearances.top': 'Odmik mora biti celo število v mm (0 ali več) ali prazno.',
      'ports.0.name': 'Vnesi ime priključka.',
      'ports.1.z': 'Vnesi celo število v mm.',
    })
  })
})

describe('previewType', () => {
  it('is null until the dimensions are complete', () => {
    const draft = draftFromTemplate(template('indoor'), 'id-1')
    draft.width = '600'
    expect(previewType(draft)).toBeNull()
    draft.depth = '400'
    draft.height = '800'
    expect(previewType(draft)?.shape).toEqual({ kind: 'box', width: 600, depth: 400, height: 800 })
  })

  it('skips ports whose coordinates are not complete yet', () => {
    const draft = draftFromType(boxType)
    draft.ports[0]!.x = ''
    expect(previewType(draft)?.ports.map((p) => p.id)).toEqual(['p2'])
  })
})

describe('port outer diameter and 3D model in the form', () => {
  const withDiameter = {
    ...boxType,
    ports: boxType.ports.map((p, i) => (i === 0 ? { ...p, outerDiameter: 22 } : p)),
  }

  it('keeps entered diameters (and leaves missing ones empty) when a type is edited', () => {
    const draft = draftFromType(withDiameter)
    expect(draft.ports.map((p) => p.outerDiameter)).toEqual(['22', ''])
    expect(draftToType(draft)).toEqual({ ok: true, type: withDiameter })
  })

  it('rejects an invalid diameter', () => {
    const draft = draftFromType(withDiameter)
    draft.ports[1]!.outerDiameter = '-5'
    const result = draftToType(draft)
    expect(!result.ok && result.errors['ports.1.outerDiameter']).toBe(
      'Premer mora biti celo število v mm, večje od 0, ali prazno.',
    )
  })

  it('keeps the attached 3D model', () => {
    const model = {
      path: '11111111-2222-3333-4444-555555555555/66666666-7777-8888-9999-000000000000/a.glb',
      fileName: 'a.glb',
      rotation: 180 as const,
      bounds: { min: { x: -1, y: 0, z: -1 }, max: { x: 1, y: 2, z: 1 } },
    }
    const result = draftToType(draftFromType({ ...boxType, model }))
    expect(result.ok && result.type.model).toEqual(model)
  })
})
