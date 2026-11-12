import { describe, expect, it } from 'vitest'
import type { Wall } from './scene'
import {
  pointAtDistance,
  pointAtOffset,
  projectOntoWall,
  wallAngle,
  wallDirection,
  wallLength,
} from './wallGeometry'

const wall = (sx: number, sy: number, ex: number, ey: number): Wall => ({
  id: 'w',
  start: { x: sx, y: sy },
  end: { x: ex, y: ey },
  thickness: 200,
  height: 2600,
})

describe('wallLength', () => {
  it('measures axis-aligned and slanted walls', () => {
    expect(wallLength(wall(0, 0, 3200, 0))).toBe(3200)
    expect(wallLength(wall(0, 0, 0, -1800))).toBe(1800)
    expect(wallLength(wall(0, 0, 3000, 4000))).toBe(5000)
  })
})

describe('wallAngle', () => {
  it('returns the axis angle in radians, counter-clockwise from +x', () => {
    expect(wallAngle(wall(0, 0, 100, 0))).toBe(0)
    expect(wallAngle(wall(0, 0, 0, 100))).toBeCloseTo(Math.PI / 2)
    expect(wallAngle(wall(0, 0, -100, 0))).toBeCloseTo(Math.PI)
    expect(wallAngle(wall(0, 0, 100, 100))).toBeCloseTo(Math.PI / 4)
  })
})

describe('wallDirection', () => {
  it('is a unit vector along the axis', () => {
    const d = wallDirection(wall(0, 0, 3000, 4000))
    expect(d.x).toBeCloseTo(0.6)
    expect(d.y).toBeCloseTo(0.8)
  })

  it('is zero for a degenerate wall', () => {
    expect(wallDirection(wall(5, 5, 5, 5))).toEqual({ x: 0, y: 0 })
  })
})

describe('pointAtOffset', () => {
  it('returns the axis point at a distance from the start', () => {
    expect(pointAtOffset(wall(1000, 0, 4000, 0), 500)).toEqual({ x: 1500, y: 0 })
    const p = pointAtOffset(wall(0, 0, 3000, 4000), 2500)
    expect(p.x).toBeCloseTo(1500)
    expect(p.y).toBeCloseTo(2000)
  })
})

describe('pointAtDistance', () => {
  it('returns an integer point at a given angle and distance', () => {
    expect(pointAtDistance({ x: 0, y: 0 }, 0, 1500)).toEqual({ x: 1500, y: 0 })
    expect(pointAtDistance({ x: 100, y: 100 }, Math.PI / 2, 1500)).toEqual({ x: 100, y: 1600 })
    expect(pointAtDistance({ x: 0, y: 0 }, Math.PI / 4, 1000)).toEqual({ x: 707, y: 707 })
  })
})

describe('projectOntoWall', () => {
  it('returns the position along the axis and the perpendicular distance', () => {
    expect(projectOntoWall(wall(0, 0, 3000, 0), { x: 1200, y: 80 })).toEqual({
      along: 1200,
      distance: 80,
    })
  })

  it('clamps the projection to the wall segment', () => {
    expect(projectOntoWall(wall(0, 0, 3000, 0), { x: -400, y: 300 })).toEqual({
      along: 0,
      distance: 500,
    })
  })
})
