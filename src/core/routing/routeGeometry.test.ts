import { describe, expect, it } from 'vitest'
import { roomScene } from '../testFixtures'
import { routeStats, simplifyRoute, wallCrossings } from './routeGeometry'

const p = (x: number, y: number, z: number) => ({ x, y, z })

describe('simplifyRoute', () => {
  it('keeps only the ends and the corners', () => {
    expect(
      simplifyRoute([
        p(0, 0, 0),
        p(50, 0, 0),
        p(100, 0, 0),
        p(100, 0, 0),
        p(100, 50, 0),
        p(100, 100, 0),
        p(100, 100, 50),
      ]),
    ).toEqual([p(0, 0, 0), p(100, 0, 0), p(100, 100, 0), p(100, 100, 50)])
  })

  it('keeps a U-turn as two corners', () => {
    expect(simplifyRoute([p(0, 0, 0), p(100, 0, 0), p(100, 50, 0), p(0, 50, 0)])).toHaveLength(4)
  })
})

describe('routeStats', () => {
  it('measures the length and counts bends', () => {
    expect(routeStats([p(0, 0, 0), p(100, 0, 0), p(100, 200, 0), p(100, 200, 300)])).toEqual({
      length: 600,
      bends: 2,
    })
    expect(routeStats([])).toEqual({ length: 0, bends: 0 })
  })
})

describe('wallCrossings', () => {
  // Room walls: w1 bottom (y = 0), w2 right (x = 3200), w3 top, w4 left; thickness 200.
  it('finds a pipe passing through a wall', () => {
    const crossings = wallCrossings(roomScene(), [p(-1000, 900, 300), p(1000, 900, 300)])
    expect(crossings).toEqual([{ wallId: 'w4', segment: 0, point: p(0, 900, 300) }])
  })

  it('does not count pipes inside the room or above the wall', () => {
    expect(wallCrossings(roomScene(), [p(500, 500, 300), p(2500, 500, 300)])).toEqual([])
    expect(wallCrossings(roomScene(), [p(-1000, 900, 2700), p(1000, 900, 2700)])).toEqual([])
  })

  it('counts each wall a route passes through', () => {
    const crossings = wallCrossings(roomScene(), [p(-500, 900, 300), p(4000, 900, 300)])
    expect(crossings.map((c) => c.wallId)).toEqual(['w2', 'w4'])
  })

  it('counts a route that starts inside a wall (wall terminal)', () => {
    const crossings = wallCrossings(roomScene(), [p(3200, 900, 300), p(2900, 900, 300)])
    expect(crossings.map((c) => c.wallId)).toEqual(['w2'])
  })
})
