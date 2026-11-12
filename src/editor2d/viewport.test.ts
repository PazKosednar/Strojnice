import { describe, expect, it } from 'vitest'
import {
  displayGridStep,
  fitView,
  niceLength,
  panBy,
  screenToWorld,
  worldToScreen,
  zoomAt,
} from './viewport'

const view = { scale: 0.1, tx: 400, ty: 300 }

describe('viewport transforms', () => {
  it('maps world to screen with y flipped', () => {
    expect(worldToScreen(view, { x: 1000, y: 1000 })).toEqual({ x: 500, y: 200 })
  })

  it('inverts worldToScreen', () => {
    const p = screenToWorld(view, worldToScreen(view, { x: 1234, y: -567 }))
    expect(p.x).toBeCloseTo(1234)
    expect(p.y).toBeCloseTo(-567)
  })

  it('zooms around the anchor point', () => {
    const anchor = { x: 120, y: 80 }
    const before = screenToWorld(view, anchor)
    const zoomed = zoomAt(view, 2, anchor)
    expect(zoomed.scale).toBeCloseTo(0.2)
    const after = screenToWorld(zoomed, anchor)
    expect(after.x).toBeCloseTo(before.x)
    expect(after.y).toBeCloseTo(before.y)
  })

  it('pans by screen pixels', () => {
    expect(panBy(view, 10, -5)).toEqual({ scale: 0.1, tx: 410, ty: 295 })
  })
})

describe('fitView', () => {
  it('centres and fits the bounds', () => {
    const v = fitView({ minX: 0, minY: 0, maxX: 3200, maxY: 1800 }, 800, 600, 40)
    const centre = worldToScreen(v, { x: 1600, y: 900 })
    expect(centre.x).toBeCloseTo(400)
    expect(centre.y).toBeCloseTo(300)
    expect(v.scale).toBeCloseTo(720 / 3200)
  })

  it('has a sensible default without bounds', () => {
    const v = fitView(null, 800, 600)
    expect(worldToScreen(v, { x: 0, y: 0 })).toEqual({ x: 400, y: 300 })
  })
})

describe('niceLength', () => {
  it('picks 1/2/5 × 10^n not longer than the max pixels', () => {
    expect(niceLength(0.1, 120)).toBe(1000)
    expect(niceLength(0.1, 250)).toBe(2000)
    expect(niceLength(0.1, 600)).toBe(5000)
  })
})

describe('displayGridStep', () => {
  it('keeps the snap grid when it is dense enough on screen', () => {
    expect(displayGridStep(50, 0.5)).toBe(50)
  })

  it('coarsens the grid when zoomed out', () => {
    expect(displayGridStep(50, 0.05)).toBe(250)
    expect(displayGridStep(50, 0.01)).toBe(1000)
  })
})
