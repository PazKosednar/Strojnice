import { describe, expect, it } from 'vitest'
import { clearanceZones } from './clearances'
import { equipmentWithConflicts, sceneWarnings } from './sceneWarnings'
import { boxType, cylinderType, equipment, roomScene } from './testFixtures'

describe('clearanceZones', () => {
  it('creates a zone per side with a positive clearance', () => {
    const zones = clearanceZones(equipment())
    expect(zones.map((z) => z.side)).toEqual(['front', 'left', 'right', 'top'])
  })

  it('places the front zone in front of the equipment and the top zone above it', () => {
    const zones = clearanceZones(equipment({ elevation: 1200 }))
    const front = zones.find((z) => z.side === 'front')!
    if (front.footprint.kind !== 'polygon') throw new Error('expected a polygon')
    // Box 600 × 400, front clearance 500: y from -700 to -200.
    expect(front.footprint.points).toEqual([
      { x: -300, y: -700 },
      { x: 300, y: -700 },
      { x: 300, y: -200 },
      { x: -300, y: -200 },
    ])
    expect([front.z0, front.z1]).toEqual([1200, 2000])
    const top = zones.find((z) => z.side === 'top')!
    expect([top.z0, top.z1]).toEqual([2000, 2200])
  })

  it('follows the rotation', () => {
    const front = clearanceZones(equipment({ rotation: 180 })).find((z) => z.side === 'front')!
    if (front.footprint.kind !== 'polygon') throw new Error('expected a polygon')
    expect(Math.max(...front.footprint.points.map((p) => p.y))).toBe(700)
  })

  it('returns nothing without clearances', () => {
    expect(clearanceZones(equipment({ type: cylinderType }))).toEqual([])
  })
})

describe('sceneWarnings', () => {
  const centre = { x: 1600, y: 900 }

  it('reports nothing for equipment standing free in the room', () => {
    const scene = { ...roomScene(), equipment: [equipment({ position: centre })] }
    expect(sceneWarnings(scene)).toEqual([])
  })

  it('does not report equipment set exactly against a wall face', () => {
    // Bottom wall face at y = 100; box depth 400, back against the wall.
    const scene = {
      ...roomScene(),
      equipment: [equipment({ position: { x: 1600, y: 300 }, rotation: 180 })],
    }
    expect(sceneWarnings(scene)).toEqual([])
  })

  it('reports a collision with a wall', () => {
    const scene = {
      ...roomScene(),
      equipment: [equipment({ position: { x: 1600, y: 250 }, rotation: 180 })],
    }
    expect(sceneWarnings(scene)).toContainEqual({
      kind: 'collision',
      equipmentId: 'e1',
      other: { kind: 'wall', id: 'w1' },
    })
  })

  it('reports a collision between two items once', () => {
    const scene = {
      ...roomScene(),
      equipment: [
        equipment({ id: 'a', tag: 'A', position: centre, type: cylinderType }),
        equipment({ id: 'b', tag: 'B', position: { x: 1900, y: 900 }, type: cylinderType }),
      ],
    }
    expect(sceneWarnings(scene)).toEqual([
      { kind: 'collision', equipmentId: 'a', other: { kind: 'equipment', id: 'b' } },
    ])
  })

  it('does not report items at different heights', () => {
    const scene = {
      ...roomScene(),
      equipment: [
        equipment({
          id: 'a',
          tag: 'A',
          position: centre,
          type: { ...boxType, clearances: undefined },
        }),
        equipment({
          id: 'b',
          tag: 'B',
          position: centre,
          elevation: 1200,
          type: { ...boxType, clearances: undefined },
        }),
      ],
    }
    expect(sceneWarnings(scene)).toEqual([])
  })

  it('reports equipment standing in the clearance zone of another item', () => {
    const scene = {
      ...roomScene(),
      equipment: [
        // Wall unit on the top wall (face at y = 1700), front towards the room.
        equipment({ id: 'idu', position: { x: 1600, y: 1500 }, rotation: 0, elevation: 0 }),
        // Cylinder 300 mm in front of it: inside the 500 mm front clearance, not touching.
        equipment({
          id: 'cyl',
          tag: 'CYL-01',
          type: cylinderType,
          position: { x: 1600, y: 800 },
        }),
      ],
    }
    expect(sceneWarnings(scene)).toEqual([
      {
        kind: 'clearance',
        equipmentId: 'idu',
        side: 'front',
        intruder: { kind: 'equipment', id: 'cyl' },
      },
    ])
  })

  it('reports a wall inside a clearance zone', () => {
    // 150 mm from the left wall face; the left clearance is 100... use the right side instead.
    const scene = {
      ...roomScene(),
      equipment: [equipment({ position: { x: 2750, y: 900 } })],
    }
    // Right face of the box at x = 3050, right wall face at x = 3100: 50 mm < 100 mm.
    expect(sceneWarnings(scene)).toEqual([
      { kind: 'clearance', equipmentId: 'e1', side: 'right', intruder: { kind: 'wall', id: 'w2' } },
    ])
  })

  it('reports ports that use a system missing from the project', () => {
    const scene = roomScene()
    scene.settings.systems = scene.settings.systems.filter((s) => s.id !== 'return')
    scene.equipment = [equipment({ position: centre })]
    expect(sceneWarnings(scene)).toEqual([
      { kind: 'unknownSystem', equipmentId: 'e1', portId: 'p2', systemId: 'return' },
    ])
  })
})

describe('equipmentWithConflicts', () => {
  it('collects both sides of collisions and clearance violations', () => {
    const ids = equipmentWithConflicts([
      { kind: 'collision', equipmentId: 'a', other: { kind: 'equipment', id: 'b' } },
      { kind: 'clearance', equipmentId: 'c', side: 'front', intruder: { kind: 'wall', id: 'w' } },
      { kind: 'unknownSystem', equipmentId: 'd', portId: 'p', systemId: 's' },
    ])
    expect([...ids].sort()).toEqual(['a', 'b', 'c'])
  })
})
