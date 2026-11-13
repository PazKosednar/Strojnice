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

describe('rule violation texts', () => {
  const withObstacle = {
    ...scene,
    obstacles: [
      {
        id: 'o1',
        tag: 'OV-01',
        name: 'El. omarica',
        category: 'electrical' as const,
        center: { x: 0, y: 0 },
        width: 600,
        depth: 200,
        rotation: 0,
        bottom: 0,
        height: 1000,
      },
    ],
  }
  const base = {
    ruleId: 'r',
    hard: true,
    source: 'SIST EN 806-2, 5.3',
    pipeIds: ['p1'],
    point: { x: 0, y: 0, z: 0 },
  }

  it('gives measured and required values and the source', () => {
    expect(
      warningText(
        {
          kind: 'ruleViolation',
          pipeId: 'p1',
          violation: {
            ...base,
            kind: 'obstacleDistance',
            measured: 189,
            required: 300,
            obstacleId: 'o1',
          },
        },
        withObstacle,
      ),
    ).toBe(
      'Cev ?: razmik do ovire OV-01 je 189 mm, zahtevano najmanj 300 mm (prepoved; vir: SIST EN 806-2, 5.3).',
    )
  })

  it('describes a vertical order and a soft bend limit', () => {
    const text = (violation: object) =>
      warningText(
        { kind: 'ruleViolation', pipeId: 'p1', violation: { ...base, ...violation } as never },
        scene,
      )
    expect(
      text({ kind: 'verticalOrder', pipeIds: ['p1', 'p2'], measured: -200, required: 0 }),
    ).toBe(
      'Cev ? poteka 200 mm pod cevjo ?; zahtevano je, da poteka nad njo (prepoved; vir: SIST EN 806-2, 5.3).',
    )
    expect(text({ kind: 'maxBends', hard: false, measured: 5, required: 3 })).toBe(
      'Cev ?: 5 kolen, dovoljeno največ 3 (priporočilo; vir: SIST EN 806-2, 5.3).',
    )
  })
})
