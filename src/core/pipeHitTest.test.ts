import { describe, expect, it } from 'vitest'
import { findEndAt, findEndsAt, findPipeAt, findVertexAt } from './pipeHitTest'
import type { Pipe, Scene } from './scene'
import { boxType, equipment, roomScene } from './testFixtures'

const pipe = (id: string, systemId: string, z: number): Pipe => ({
  id,
  systemId,
  from: { kind: 'terminal', terminalId: 't' },
  to: { kind: 'terminal', terminalId: 't' },
  outerDiameter: 20,
  route: [
    { x: 0, y: 500, z },
    { x: 1000, y: 500, z },
    { x: 1000, y: 1500, z },
  ],
  mode: 'auto',
})

function scene(): Scene {
  return {
    ...roomScene(),
    equipment: [equipment({ id: 'idu', position: { x: 1600, y: 1300 }, type: boxType })],
    terminals: [
      {
        id: 't',
        tag: 'IZ-01',
        wallId: 'w2',
        offset: 900,
        height: 300,
        systemId: 'cold',
        outerDiameter: 22,
      },
    ],
    pipes: [pipe('low', 'supply', 300), pipe('high', 'return', 2000)],
  }
}

describe('findEndAt', () => {
  it('finds a port near the point', () => {
    // boxType port p2 at local (200, -200) -> plan (1800, 1100).
    expect(findEndAt(scene(), { x: 1805, y: 1098 }, 20)).toEqual({
      kind: 'port',
      equipmentId: 'idu',
      portId: 'p2',
    })
  })

  it('finds a wall terminal on the wall axis', () => {
    expect(findEndAt(scene(), { x: 3195, y: 905 }, 20)).toEqual({
      kind: 'terminal',
      terminalId: 't',
    })
  })

  it('returns null away from all ends', () => {
    expect(findEndAt(scene(), { x: 500, y: 500 }, 20)).toBeNull()
  })
})

describe('findEndsAt', () => {
  it('returns every end at a plan position, also ports stacked above each other', () => {
    const stacked = {
      ...boxType,
      ports: [
        { ...boxType.ports[1]!, id: 'low', position: { x: 200, y: -200, z: 100 } },
        { ...boxType.ports[1]!, id: 'high', position: { x: 200, y: -200, z: 600 } },
      ],
    }
    const s: Scene = {
      ...scene(),
      equipment: [equipment({ id: 'idu', position: { x: 1600, y: 1300 }, type: stacked })],
    }
    expect(findEndsAt(s, { x: 1800, y: 1100 }, 10)).toEqual([
      { kind: 'port', equipmentId: 'idu', portId: 'low' },
      { kind: 'port', equipmentId: 'idu', portId: 'high' },
    ])
  })
})

describe('findPipeAt', () => {
  it('prefers the highest pipe where pipes overlap in the plan', () => {
    expect(findPipeAt(scene(), { x: 500, y: 505 }, 5)).toMatchObject({
      pipe: { id: 'high' },
      segment: 0,
    })
  })

  it('skips hidden systems', () => {
    expect(findPipeAt(scene(), { x: 500, y: 505 }, 5, ['return'])?.pipe.id).toBe('low')
  })

  it('reports the segment and returns null away from pipes', () => {
    expect(findPipeAt(scene(), { x: 1003, y: 1200 }, 5)?.segment).toBe(1)
    expect(findPipeAt(scene(), { x: 500, y: 700 }, 5)).toBeNull()
  })
})

describe('findVertexAt', () => {
  it('finds interior vertices only', () => {
    const p = pipe('a', 'supply', 0)
    expect(findVertexAt(p, { x: 1004, y: 497 }, 10)).toBe(1)
    expect(findVertexAt(p, { x: 0, y: 500 }, 10)).toBeNull()
  })
})
