import { describe, expect, it } from 'vitest'
import { cylinderType, equipment, roomScene } from '../core/testFixtures'
import { warningText } from './warningMessages'

const scene = {
  ...roomScene(),
  equipment: [
    equipment({ id: 'idu', tag: 'IDU-01' }),
    equipment({ id: 'cyl', tag: 'CYL-01', type: cylinderType }),
  ],
}

describe('warningText', () => {
  it('describes collisions', () => {
    expect(
      warningText(
        { kind: 'collision', equipmentId: 'idu', other: { kind: 'equipment', id: 'cyl' } },
        scene,
      ),
    ).toBe('IDU-01 in CYL-01 se prekrivata.')
    expect(
      warningText(
        { kind: 'collision', equipmentId: 'cyl', other: { kind: 'wall', id: 'w1' } },
        scene,
      ),
    ).toBe('CYL-01 sega v steno.')
  })

  it('describes clearance violations', () => {
    expect(
      warningText(
        {
          kind: 'clearance',
          equipmentId: 'idu',
          side: 'front',
          intruder: { kind: 'equipment', id: 'cyl' },
        },
        scene,
      ),
    ).toBe('V coni odmika naprave IDU-01 (spredaj) je CYL-01.')
    expect(
      warningText(
        {
          kind: 'clearance',
          equipmentId: 'idu',
          side: 'right',
          intruder: { kind: 'wall', id: 'w2' },
        },
        scene,
      ),
    ).toBe('V coni odmika naprave IDU-01 (desno) je stena.')
  })

  it('describes ports with an unknown system', () => {
    expect(
      warningText(
        { kind: 'unknownSystem', equipmentId: 'idu', portId: 'p2', systemId: 'gone' },
        scene,
      ),
    ).toBe('IDU-01: priključek »Return« uporablja sistem, ki ga v projektu ni.')
  })
})
