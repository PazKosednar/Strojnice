import { describe, expect, it } from 'vitest'
import { axisCoords, buildGrid, coordIndex, nodeCoords, nodeIndex } from './grid'
import { MinHeap } from './heap'

describe('axisCoords', () => {
  it('covers the range on multiples of the step and adds the extra planes', () => {
    expect(axisCoords(-120, 160, 100, [33, 100])).toEqual([-200, -100, 0, 33, 100])
  })
})

describe('grid indexing', () => {
  const grid = { xs: [0, 1, 2], ys: [0, 1], zs: [0, 1, 2, 3], step: 1 }

  it('round-trips node indices', () => {
    for (let i = 0; i < 24; i++) {
      const [ix, iy, iz] = nodeCoords(grid, i)
      expect(nodeIndex(grid, ix, iy, iz)).toBe(i)
    }
  })

  it('finds exact coordinates', () => {
    expect(coordIndex([-50, 0, 33, 100], 33)).toBe(2)
    expect(coordIndex([-50, 0, 33, 100], 34)).toBe(-1)
  })
})

describe('buildGrid', () => {
  const bounds = { minX: 0, maxX: 1000, minY: 0, maxY: 1000, minZ: 0, maxZ: 1000 }
  const none = { xs: [], ys: [], zs: [] }

  it('uses the requested step when the grid is small enough', () => {
    expect(buildGrid(bounds, 100, none, 10_000, 400)?.step).toBe(100)
  })

  it('coarsens a grid that would be too large', () => {
    // 11³ = 1331 nodes at 100 mm; 6³ = 216 at 200 mm.
    expect(buildGrid(bounds, 100, none, 500, 400)?.step).toBe(200)
  })

  it('gives up beyond the maximum step', () => {
    expect(buildGrid(bounds, 100, none, 10, 200)).toBeNull()
  })

  it('rejects huge or non-finite bounds without building anything', () => {
    const huge = { ...bounds, minX: -1e15, maxX: 1e15 }
    const started = Date.now()
    expect(buildGrid(huge, 50, none, 600_000, 200)).toBeNull()
    expect(Date.now() - started).toBeLessThan(100)
    expect(buildGrid({ ...bounds, maxZ: Infinity }, 50, none, 600_000, 200)).toBeNull()
    expect(buildGrid(bounds, NaN, none, 600_000, 200)).toBeNull()
    expect(buildGrid({ ...bounds, minX: 2000 }, 50, none, 600_000, 200)).toBeNull()
  })

  it('stops the coordinate loop where the step no longer changes the value', () => {
    expect(axisCoords(2 ** 53, 2 ** 53 + 10, 1, []).length).toBeLessThan(20)
  })
})

describe('MinHeap', () => {
  it('pops values in key order', () => {
    const heap = new MinHeap()
    const keys = [5, 1, 9, 3, 3, 7, 0, 8]
    keys.forEach((k, i) => heap.push(k, i))
    const out: number[] = []
    for (let v = heap.pop(); v !== undefined; v = heap.pop()) out.push(keys[v]!)
    expect(out).toEqual([...keys].sort((a, b) => a - b))
  })

  it('grows beyond its initial capacity', () => {
    const heap = new MinHeap()
    for (let i = 3000; i > 0; i--) heap.push(i, i)
    expect(heap.size).toBe(3000)
    expect(heap.pop()).toBe(1)
  })
})
