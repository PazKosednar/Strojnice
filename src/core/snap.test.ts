import { describe, expect, it } from 'vitest'
import type { Wall } from './scene'
import { snapAngle, snapPoint, snapToEndpoint, snapToGrid } from './snap'

const wall = (sx: number, sy: number, ex: number, ey: number, id = 'w'): Wall => ({
  id,
  start: { x: sx, y: sy },
  end: { x: ex, y: ey },
  thickness: 200,
  height: 2600,
})

describe('snapToGrid', () => {
  it('rounds both coordinates to the nearest grid step', () => {
    expect(snapToGrid({ x: 124, y: -76 }, 50)).toEqual({ x: 100, y: -100 })
    expect(snapToGrid({ x: 125, y: 26 }, 50)).toEqual({ x: 150, y: 50 })
  })

  it('only rounds to integers when the grid step is not positive', () => {
    expect(snapToGrid({ x: 12.4, y: 7.6 }, 0)).toEqual({ x: 12, y: 8 })
  })
})

describe('snapToEndpoint', () => {
  const walls = [wall(0, 0, 3000, 0), wall(3000, 0, 3000, 2000)]

  it('returns the nearest endpoint within the tolerance', () => {
    expect(snapToEndpoint({ x: 2960, y: 30 }, walls, 100)).toEqual({ x: 3000, y: 0 })
  })

  it('returns null when no endpoint is close enough', () => {
    expect(snapToEndpoint({ x: 1500, y: 0 }, walls, 100)).toBeNull()
  })
})

describe('snapAngle', () => {
  it('snaps to the closest reference angle multiple of 90° within the tolerance', () => {
    const deg = (d: number) => (d * Math.PI) / 180
    expect(snapAngle(deg(3), [0], deg(5))).toBeCloseTo(0)
    expect(snapAngle(deg(93), [0], deg(5))).toBeCloseTo(deg(90))
    expect(snapAngle(deg(-178), [0], deg(5))).toBeCloseTo(deg(-180))
  })

  it('snaps relative to a slanted reference direction', () => {
    const deg = (d: number) => (d * Math.PI) / 180
    expect(snapAngle(deg(122), [deg(30)], deg(5))).toBeCloseTo(deg(120))
  })

  it('returns null outside the tolerance', () => {
    const deg = (d: number) => (d * Math.PI) / 180
    expect(snapAngle(deg(20), [0], deg(5))).toBeNull()
  })
})

describe('snapPoint', () => {
  const walls = [wall(0, 0, 3000, 0)]
  const options = { walls, gridSize: 50, endpointTolerance: 100, angleTolerance: Math.PI / 36 }

  it('prefers an existing endpoint', () => {
    expect(snapPoint({ x: 3040, y: -20 }, { ...options, from: { x: 3000, y: 2000 } })).toEqual({
      point: { x: 3000, y: 0 },
      kind: 'endpoint',
    })
  })

  it('keeps a right angle to the previous point and rounds the length to the grid', () => {
    expect(snapPoint({ x: 3060, y: 1523 }, { ...options, from: { x: 3000, y: 0 } })).toEqual({
      point: { x: 3000, y: 1500 },
      kind: 'angle',
    })
  })

  it('keeps a right angle to the previous wall direction', () => {
    const slanted = [wall(0, 0, 3000, 3000)]
    const result = snapPoint(
      { x: 2010, y: 3980 },
      { ...options, walls: slanted, from: { x: 3000, y: 3000 }, referenceAngle: Math.PI / 4 },
    )
    expect(result.kind).toBe('angle')
    // 135° from the previous point, length 1393 rounded to the 50 mm grid -> 1400.
    expect(result.point).toEqual({ x: 2010, y: 3990 })
  })

  it('falls back to the grid', () => {
    expect(snapPoint({ x: 1234, y: 777 }, { ...options, from: { x: 0, y: 0 } })).toEqual({
      point: { x: 1250, y: 800 },
      kind: 'grid',
    })
  })

  it('uses the grid when there is no previous point', () => {
    expect(snapPoint({ x: 1234, y: 777 }, options)).toEqual({
      point: { x: 1250, y: 800 },
      kind: 'grid',
    })
  })
})
