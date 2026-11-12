import { describe, expect, it } from 'vitest'
import { createRectangularRoom } from './rectangularRoom'
import { wallLength } from './wallGeometry'

const settings = { wallThickness: 200, wallHeight: 2600 }
const ids = () => {
  let n = 0
  return () => `w${++n}`
}

describe('createRectangularRoom', () => {
  it('creates four walls with the given axis dimensions', () => {
    const walls = createRectangularRoom(3200, 1800, settings, ids())
    expect(walls).toHaveLength(4)
    expect(walls.map(wallLength)).toEqual([3200, 1800, 3200, 1800])
    expect(walls.map((w) => w.id)).toEqual(['w1', 'w2', 'w3', 'w4'])
  })

  it('chains the walls: each wall ends where the next one starts', () => {
    const walls = createRectangularRoom(3200, 1800, settings, ids())
    walls.forEach((wall, i) => {
      expect(wall.end).toEqual(walls[(i + 1) % 4]!.start)
    })
    expect(walls[0]!.start).toEqual({ x: 0, y: 0 })
    expect(walls[2]!.start).toEqual({ x: 3200, y: 1800 })
  })

  it('uses thickness and height from the settings', () => {
    const walls = createRectangularRoom(1000, 1000, { wallThickness: 120, wallHeight: 2400 }, ids())
    expect(walls.every((w) => w.thickness === 120 && w.height === 2400)).toBe(true)
  })

  it('places the room at the given origin', () => {
    const walls = createRectangularRoom(1000, 500, settings, ids(), { x: 5000, y: -200 })
    expect(walls[0]!.start).toEqual({ x: 5000, y: -200 })
    expect(walls[1]!.end).toEqual({ x: 6000, y: 300 })
  })

  it('rejects invalid dimensions', () => {
    expect(() => createRectangularRoom(0, 1000, settings, ids())).toThrow(RangeError)
    expect(() => createRectangularRoom(1000, 10.5, settings, ids())).toThrow(RangeError)
  })
})
