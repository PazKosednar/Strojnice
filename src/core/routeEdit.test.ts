import { describe, expect, it } from 'vitest'
import { insertVertex, moveSegment, removeVertex, segmentAxis, setSegmentHeight } from './routeEdit'
import type { RoutePoint } from './scene'

const p = (x: number, y: number, z = 0): RoutePoint => ({ x, y, z })

const isOrthogonal = (route: readonly RoutePoint[]) =>
  route.every((q, i) => {
    const prev = route[i - 1]
    return !prev || Number(q.x !== prev.x) + Number(q.y !== prev.y) + Number(q.z !== prev.z) === 1
  })

// U-shaped route: up, across, down.
const u = [p(0, 0), p(0, 1000), p(2000, 1000), p(2000, 0)]

describe('segmentAxis', () => {
  it('names the axis of a segment', () => {
    expect(segmentAxis(p(0, 0), p(5, 0))).toBe('x')
    expect(segmentAxis(p(0, 0, 0), p(0, 0, 5))).toBe('z')
    expect(segmentAxis(p(1, 1), p(1, 1))).toBeNull()
  })
})

describe('moveSegment', () => {
  it('moves a middle segment; perpendicular neighbours just change length', () => {
    expect(moveSegment(u, 1, 'y', 300)).toEqual([p(0, 0), p(0, 1300), p(2000, 1300), p(2000, 0)])
  })

  it('keeps the connection points fixed by inserting a jog', () => {
    const moved = moveSegment(u, 0, 'x', 200)!
    expect(moved[0]).toEqual(p(0, 0))
    expect(moved[moved.length - 1]).toEqual(p(2000, 0))
    expect(isOrthogonal(moved)).toBe(true)
    expect(moved).toEqual([p(0, 0), p(200, 0), p(200, 1000), p(2000, 1000), p(2000, 0)])
  })

  it('inserts connectors when a neighbour runs along another axis', () => {
    // Straight run split in three collinear pieces; moving the middle one creates a bump.
    const straight = [p(0, 0), p(500, 0), p(1500, 0), p(2000, 0)]
    expect(moveSegment(straight, 1, 'y', 400)).toEqual([
      p(0, 0),
      p(500, 0),
      p(500, 400),
      p(1500, 400),
      p(1500, 0),
      p(2000, 0),
    ])
  })

  it('rejects moving a segment along its own axis or by a fractional amount', () => {
    expect(moveSegment(u, 1, 'x', 100)).toBeNull()
    expect(moveSegment(u, 1, 'y', 10.5)).toBeNull()
    expect(moveSegment(u, 9, 'y', 10)).toBeNull()
  })
})

describe('insertVertex', () => {
  it('splits a segment at a point on it', () => {
    expect(insertVertex(u, 1, p(799.6, 1000))).toEqual([
      p(0, 0),
      p(0, 1000),
      p(800, 1000),
      p(2000, 1000),
      p(2000, 0),
    ])
  })

  it('rejects points at or beyond the segment ends', () => {
    expect(insertVertex(u, 1, p(0, 1000))).toBeNull()
    expect(insertVertex(u, 1, p(2500, 1000))).toBeNull()
  })

  it('lets part of a segment be moved after splitting', () => {
    const split = insertVertex(u, 1, p(800, 1000))!
    const moved = moveSegment(split, 2, 'y', 300)!
    expect(isOrthogonal(moved)).toBe(true)
    expect(moved).toEqual([
      p(0, 0),
      p(0, 1000),
      p(800, 1000),
      p(800, 1300),
      p(2000, 1300),
      p(2000, 0),
    ])
  })
})

describe('removeVertex', () => {
  it('replaces a corner by the opposite corner, keeping the route connected', () => {
    const l = [p(0, 0), p(0, 1000), p(2000, 1000)]
    expect(removeVertex(l, 1)).toEqual([p(0, 0), p(2000, 0), p(2000, 1000)])
  })

  it('simply removes a collinear point', () => {
    expect(removeVertex([p(0, 0), p(500, 0), p(1000, 0)], 1)).toEqual([p(0, 0), p(1000, 0)])
  })

  it('never removes the end points', () => {
    expect(removeVertex(u, 0)).toBeNull()
    expect(removeVertex(u, 3)).toBeNull()
  })

  it('merges segments that become collinear', () => {
    expect(removeVertex(u, 2)).toEqual([p(0, 0), p(0, 1000), p(0, 0), p(2000, 0)])
  })
})

describe('setSegmentHeight', () => {
  it('lifts a horizontal segment; vertical neighbours adapt', () => {
    const route = [p(0, 0, 200), p(0, 0, 500), p(1000, 0, 500), p(1000, 0, 200)]
    expect(setSegmentHeight(route, 1, 2400)).toEqual([
      p(0, 0, 200),
      p(0, 0, 2400),
      p(1000, 0, 2400),
      p(1000, 0, 200),
    ])
  })

  it('rejects vertical segments', () => {
    expect(setSegmentHeight([p(0, 0, 0), p(0, 0, 500)], 0, 100)).toBeNull()
  })
})
