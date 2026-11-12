import { describe, expect, it } from 'vitest'
import { bodiesCollide, footprintsOverlap, rangesOverlap } from './collisions'
import type { Footprint } from './equipmentGeometry'

const rect = (x0: number, y0: number, x1: number, y1: number): Footprint => ({
  kind: 'polygon',
  points: [
    { x: x0, y: y0 },
    { x: x1, y: y0 },
    { x: x1, y: y1 },
    { x: x0, y: y1 },
  ],
})

const circle = (x: number, y: number, radius: number): Footprint => ({
  kind: 'circle',
  center: { x, y },
  radius,
})

/** Square of side 2·h rotated by 45° (a diamond). */
const diamond = (x: number, y: number, h: number): Footprint => ({
  kind: 'polygon',
  points: [
    { x: x + h, y },
    { x, y: y + h },
    { x: x - h, y },
    { x, y: y - h },
  ],
})

describe('footprintsOverlap', () => {
  it('detects overlapping rectangles', () => {
    expect(footprintsOverlap(rect(0, 0, 100, 100), rect(50, 50, 150, 150))).toBe(true)
  })

  it('treats touching rectangles and sub-millimetre overlap as no collision', () => {
    expect(footprintsOverlap(rect(0, 0, 100, 100), rect(100, 0, 200, 100))).toBe(false)
    expect(footprintsOverlap(rect(0, 0, 100, 100), rect(99.4, 0, 200, 100))).toBe(false)
    expect(footprintsOverlap(rect(0, 0, 100, 100), rect(98, 0, 200, 100))).toBe(true)
  })

  it('separates rectangles that only overlap in their bounding boxes', () => {
    // The diamond's bounding box overlaps the square's corner, the shapes do not.
    expect(footprintsOverlap(rect(0, 0, 100, 100), diamond(170, 170, 100))).toBe(false)
    expect(footprintsOverlap(rect(0, 0, 100, 100), diamond(140, 140, 100))).toBe(true)
  })

  it('handles circle against rectangle, including corners', () => {
    expect(footprintsOverlap(circle(150, 50, 60), rect(0, 0, 100, 100))).toBe(true)
    expect(footprintsOverlap(circle(150, 50, 50), rect(0, 0, 100, 100))).toBe(false)
    // Near the corner: bounding boxes overlap but the circle misses the corner.
    expect(footprintsOverlap(circle(140, 140, 50), rect(0, 0, 100, 100))).toBe(false)
    expect(footprintsOverlap(circle(130, 130, 50), rect(0, 0, 100, 100))).toBe(true)
  })

  it('detects a circle fully inside a rectangle', () => {
    expect(footprintsOverlap(circle(500, 500, 10), rect(0, 0, 1000, 1000))).toBe(true)
  })

  it('handles two circles', () => {
    expect(footprintsOverlap(circle(0, 0, 50), circle(90, 0, 50))).toBe(true)
    expect(footprintsOverlap(circle(0, 0, 50), circle(100, 0, 50))).toBe(false)
    expect(footprintsOverlap(circle(0, 0, 50), circle(0, 0, 20))).toBe(true)
  })
})

describe('rangesOverlap', () => {
  it('is false for touching or separate ranges', () => {
    expect(rangesOverlap(0, 800, 800, 1600)).toBe(false)
    expect(rangesOverlap(0, 800, 1200, 2000)).toBe(false)
    expect(rangesOverlap(0, 800, 700, 2000)).toBe(true)
  })
})

describe('bodiesCollide', () => {
  it('needs overlap in plan and in height', () => {
    const low = { footprint: rect(0, 0, 100, 100), z0: 0, z1: 800 }
    const high = { footprint: rect(0, 0, 100, 100), z0: 1200, z1: 2000 }
    const beside = { footprint: rect(200, 0, 300, 100), z0: 0, z1: 800 }
    expect(bodiesCollide(low, high)).toBe(false)
    expect(bodiesCollide(low, beside)).toBe(false)
    expect(bodiesCollide(low, { ...high, z0: 500 })).toBe(true)
  })
})
