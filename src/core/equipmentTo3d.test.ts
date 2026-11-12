import { describe, expect, it } from 'vitest'
import { equipmentTo3d, PORT_STUB_LENGTH, UNKNOWN_SYSTEM_COLOR } from './equipmentTo3d'
import { createEmptyScene, type Equipment, type Scene } from './scene'
import { boxType, cylinderType, equipment } from './testFixtures'

const sceneWith = (...items: Equipment[]): Scene => ({ ...createEmptyScene(), equipment: items })

const close = (actual: readonly number[], expected: readonly number[]) =>
  actual.forEach((v, i) => expect(v).toBeCloseTo(expected[i]!, 6))

describe('equipmentTo3d', () => {
  it('returns nothing for a scene without equipment', () => {
    expect(equipmentTo3d(createEmptyScene())).toEqual([])
  })

  it('converts a box to metres at the right height (plan y -> world -z)', () => {
    const [item] = equipmentTo3d(
      sceneWith(equipment({ position: { x: 1000, y: 2000 }, elevation: 1200 })),
    )
    expect(item!.shape).toEqual({ kind: 'box', size: [0.6, 0.8, 0.4] })
    close(item!.center, [1, 1.6, -2])
    expect(item!.rotationY).toBe(0)
    expect(item!.tag).toBe('IDU-01')
  })

  it('converts a cylinder standing on the floor', () => {
    const [item] = equipmentTo3d(
      sceneWith(equipment({ type: cylinderType, tag: 'CYL-01', position: { x: 500, y: 0 } })),
    )
    expect(item!.shape).toEqual({ kind: 'cylinder', radius: 0.3, height: 1.5 })
    close(item!.center, [0.5, 0.75, 0])
  })

  it('passes the rotation in radians', () => {
    const [item] = equipmentTo3d(sceneWith(equipment({ rotation: 90 })))
    expect(item!.rotationY).toBeCloseTo(Math.PI / 2)
  })

  it('places port stubs in the system colour, pointing away from the equipment', () => {
    const [item] = equipmentTo3d(
      sceneWith(equipment({ position: { x: 1000, y: 1000 }, rotation: 90, elevation: 1200 })),
    )
    const [down, front] = item!.ports
    // p1: local (-200, 0, 0), direction -z, system "supply".
    expect(down!.color).toBe('#d62728')
    close(down!.direction, [0, -1, 0])
    close(down!.center, [1, 1.2 - PORT_STUB_LENGTH / 2, -0.8])
    // p2: local (200, -200, 100), direction -y -> world +x after a 90° turn.
    expect(front!.color).toBe('#1f77b4')
    close(front!.direction, [1, 0, 0])
    close(front!.center, [1.2 + PORT_STUB_LENGTH / 2, 1.3, -1.2])
  })

  it('uses a neutral colour for ports of an unknown system', () => {
    const scene = sceneWith(equipment())
    scene.settings.systems = []
    expect(equipmentTo3d(scene)[0]!.ports.map((p) => p.color)).toEqual([
      UNKNOWN_SYSTEM_COLOR,
      UNKNOWN_SYSTEM_COLOR,
    ])
  })

  it('anchors the tag label above the top face', () => {
    const [item] = equipmentTo3d(sceneWith(equipment({ elevation: 1200, type: boxType })))
    expect(item!.labelPosition[1]).toBeGreaterThan(2.0)
    expect(item!.labelPosition[1]).toBeLessThan(2.3)
  })
})
