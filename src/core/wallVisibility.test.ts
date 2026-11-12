import { describe, expect, it } from 'vitest'
import { roomScene, wall } from './testFixtures'
import { createEmptyScene } from './scene'
import { isTopView, isWallHidden, wallFacings, type WallFacing } from './wallVisibility'

// Room 3200 × 1800: w1 bottom (y = 0), w2 right (x = 3200), w3 top (y = 1800), w4 left (x = 0).
const facings = () => new Map(wallFacings(roomScene()).map((f) => [f.id, f]))

describe('wallFacings', () => {
  it('points every normal away from the room centre', () => {
    const f = facings()
    expect(f.get('w1')!.normal).toEqual({ x: 0, y: -1 })
    expect(f.get('w2')!.normal).toEqual({ x: 1, y: 0 })
    expect(f.get('w3')!.normal).toEqual({ x: 0, y: 1 })
    expect(f.get('w4')!.normal).toEqual({ x: -1, y: 0 })
  })

  it('handles a free-standing wall through the centre and an empty scene', () => {
    const scene = { ...createEmptyScene(), walls: [wall('a', 0, 0, 1000, 0)] }
    expect(wallFacings(scene)[0]!.normal).toEqual({ x: 0, y: 1 })
    expect(wallFacings(createEmptyScene())).toEqual([])
  })
})

/** Camera 6 m from the room centre (1600, 900) in plan direction `deg`, 3 m high. */
const cameraAt = (deg: number) => {
  const rad = (deg * Math.PI) / 180
  return { x: 1600 + Math.cos(rad) * 6000, y: 900 + Math.sin(rad) * 6000, z: 3000 }
}

function hiddenWalls(deg: number): string[] {
  return [...facings().values()]
    .filter((f) => isWallHidden(f, cameraAt(deg), false))
    .map((f) => f.id)
    .sort()
}

describe('isWallHidden', () => {
  it('hides the walls facing the camera and keeps the back walls', () => {
    expect(hiddenWalls(-90)).toEqual(['w1']) // camera south -> bottom wall hidden
    expect(hiddenWalls(0)).toEqual(['w2']) // camera east -> right wall hidden
    expect(hiddenWalls(-45)).toEqual(['w1', 'w2']) // south-east corner: both front walls
    expect(hiddenWalls(135)).toEqual(['w3', 'w4'])
  })

  it('always keeps at least the two back walls of a rectangular room', () => {
    for (let deg = 0; deg < 360; deg += 5) {
      expect(hiddenWalls(deg).length).toBeLessThanOrEqual(2)
    }
  })

  it('never hides a wall when the camera is on its inner side', () => {
    const f = facings().get('w1')!
    expect(isWallHidden(f, { x: 1600, y: 900, z: 1000 }, true)).toBe(false)
  })

  it('uses hysteresis so a wall at the threshold does not flicker', () => {
    const f: WallFacing = { id: 'w', mid: { x: 0, y: 0 }, normal: { x: 0, y: -1 }, midHeight: 1300 }
    const at = (deg: number) => {
      // Angle `deg` between the normal (-y) and the direction to the camera.
      const rad = (deg * Math.PI) / 180
      return { x: Math.sin(rad) * 5000, y: -Math.cos(rad) * 5000, z: 1000 }
    }
    expect(isWallHidden(f, at(75), false)).toBe(false) // not hidden yet (needs < 70°)
    expect(isWallHidden(f, at(65), false)).toBe(true)
    expect(isWallHidden(f, at(75), true)).toBe(true) // stays hidden (shows again > 80°)
    expect(isWallHidden(f, at(85), true)).toBe(false)
  })
})

describe('isTopView', () => {
  const target = { x: 0, y: 0, z: 1000 }
  it('enters above 60° and leaves below 55°', () => {
    const at = (deg: number) => {
      const rad = (deg * Math.PI) / 180
      return { x: Math.cos(rad) * 5000, y: 0, z: 1000 + Math.sin(rad) * 5000 }
    }
    expect(isTopView(at(58), target, false)).toBe(false)
    expect(isTopView(at(62), target, false)).toBe(true)
    expect(isTopView(at(58), target, true)).toBe(true)
    expect(isTopView(at(50), target, true)).toBe(false)
  })
})
