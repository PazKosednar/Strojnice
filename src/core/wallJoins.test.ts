import { describe, expect, it } from 'vitest'
import type { Wall } from './scene'
import { wallExtensions, wallOutline } from './wallJoins'

const wall = (id: string, sx: number, sy: number, ex: number, ey: number, t = 200): Wall => ({
  id,
  start: { x: sx, y: sy },
  end: { x: ex, y: ey },
  thickness: t,
  height: 2600,
})

describe('wallExtensions', () => {
  it('extends ends that share a coordinate with another wall by half the thickness', () => {
    const walls = [wall('a', 0, 0, 3000, 0), wall('b', 3000, 0, 3000, 2000, 120)]
    const ext = wallExtensions(walls)
    expect(ext.get('a')).toEqual({ start: 0, end: 100 })
    expect(ext.get('b')).toEqual({ start: 60, end: 0 })
  })

  it('does not extend a free-standing wall', () => {
    expect(wallExtensions([wall('a', 0, 0, 1000, 0)]).get('a')).toEqual({ start: 0, end: 0 })
  })
})

describe('wallOutline', () => {
  it('returns the rectangle around the axis', () => {
    expect(wallOutline(wall('a', 0, 0, 1000, 0))).toEqual([
      { x: 0, y: -100 },
      { x: 1000, y: -100 },
      { x: 1000, y: 100 },
      { x: 0, y: 100 },
    ])
  })

  it('includes end extensions', () => {
    const outline = wallOutline(wall('a', 0, 0, 1000, 0), { start: 100, end: 50 })
    expect(outline[0]).toEqual({ x: -100, y: -100 })
    expect(outline[1]).toEqual({ x: 1050, y: -100 })
  })
})
