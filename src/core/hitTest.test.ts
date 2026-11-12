import { describe, expect, it } from 'vitest'
import { findEquipmentAt, findOpeningAt, findWallAt } from './hitTest'
import { createRectangularRoom } from './rectangularRoom'
import { createEmptyScene, type Scene } from './scene'
import { cylinderType, equipment } from './testFixtures'

function room(): Scene {
  let n = 0
  const scene = createEmptyScene()
  return {
    ...scene,
    walls: createRectangularRoom(3200, 1800, scene.settings, () => `w${++n}`),
    openings: [
      {
        id: 'o1',
        wallId: 'w1',
        type: 'window',
        offset: 1000,
        width: 1200,
        height: 1200,
        sillHeight: 900,
      },
    ],
  }
}

describe('findWallAt', () => {
  it('finds the wall whose body contains the point', () => {
    const hit = findWallAt(room().walls, { x: 1500, y: 90 }, 0)
    expect(hit?.wall.id).toBe('w1')
    expect(hit?.along).toBe(1500)
  })

  it('accepts points within the tolerance outside the wall body', () => {
    expect(findWallAt(room().walls, { x: 1500, y: 150 }, 60)?.wall.id).toBe('w1')
    expect(findWallAt(room().walls, { x: 1500, y: 150 }, 0)).toBeNull()
  })

  it('returns null in the middle of the room', () => {
    expect(findWallAt(room().walls, { x: 1600, y: 900 }, 50)).toBeNull()
  })
})

describe('findOpeningAt', () => {
  it('finds the opening under the point', () => {
    expect(findOpeningAt(room(), { x: 1500, y: 0 }, 0)?.id).toBe('o1')
  })

  it('returns null on a solid part of the wall', () => {
    expect(findOpeningAt(room(), { x: 500, y: 0 }, 0)).toBeNull()
  })
})

describe('findEquipmentAt', () => {
  const items = [
    equipment({ id: 'a', tag: 'A', position: { x: 0, y: 0 } }),
    equipment({ id: 'b', tag: 'B', position: { x: 200, y: 0 }, type: cylinderType }),
  ]

  it('returns the item under the point, preferring the last placed one', () => {
    expect(findEquipmentAt(items, { x: -250, y: 0 })?.id).toBe('a')
    expect(findEquipmentAt(items, { x: 100, y: 0 })?.id).toBe('b')
  })

  it('returns null on empty floor', () => {
    expect(findEquipmentAt(items, { x: 2000, y: 2000 })).toBeNull()
  })
})
