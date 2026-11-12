import { describe, expect, it } from 'vitest'
import { boxType, roomScene } from '../core/testFixtures'
import { placementAt } from './equipmentPlacement'

const options = { snapDistance: 100, free: false, rotation: 90 }

describe('placementAt', () => {
  it('snaps to a nearby wall and takes the wall rotation', () => {
    expect(placementAt(boxType, { x: 1010, y: 260 }, roomScene(), options)).toEqual({
      position: { x: 1000, y: 300 },
      rotation: 180,
      wallId: 'w1',
    })
  })

  it('uses the grid and the given rotation away from walls', () => {
    expect(placementAt(boxType, { x: 1612, y: 889 }, roomScene(), options)).toEqual({
      position: { x: 1600, y: 900 },
      rotation: 90,
      wallId: null,
    })
  })

  it('does not snap at all in free mode', () => {
    expect(
      placementAt(boxType, { x: 1010.4, y: 260 }, roomScene(), { ...options, free: true }),
    ).toEqual({ position: { x: 1010, y: 260 }, rotation: 90, wallId: null })
  })
})
