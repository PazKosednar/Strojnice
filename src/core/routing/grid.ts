/**
 * Rectilinear 3D grid: a regular step plus extra planes through given coordinates
 * (so route ends are hit exactly). Node index = (iz * ny + iy) * nx + ix.
 */
export interface Grid {
  xs: number[]
  ys: number[]
  zs: number[]
  step: number
}

/** Sorted unique coordinates from `min` to `max` on multiples of `step`, plus `extras`. */
export function axisCoords(
  min: number,
  max: number,
  step: number,
  extras: readonly number[],
): number[] {
  const values = new Set<number>(extras)
  const first = Math.floor(min / step) * step
  for (let v = first; v <= max; v += step) values.add(v)
  return [...values].sort((a, b) => a - b)
}

export function nodeCount(grid: Grid): number {
  return grid.xs.length * grid.ys.length * grid.zs.length
}

export function nodeIndex(grid: Grid, ix: number, iy: number, iz: number): number {
  return (iz * grid.ys.length + iy) * grid.xs.length + ix
}

/** Inverse of nodeIndex. */
export function nodeCoords(grid: Grid, node: number): [number, number, number] {
  const nx = grid.xs.length
  const ny = grid.ys.length
  const ix = node % nx
  const rest = (node - ix) / nx
  const iy = rest % ny
  return [ix, iy, (rest - iy) / ny]
}

/** Index of an exact coordinate on an axis, or -1. */
export function coordIndex(values: readonly number[], v: number): number {
  let lo = 0
  let hi = values.length - 1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    const m = values[mid]!
    if (m === v) return mid
    if (m < v) lo = mid + 1
    else hi = mid - 1
  }
  return -1
}

export interface Bounds3 {
  minX: number
  maxX: number
  minY: number
  maxY: number
  minZ: number
  maxZ: number
}

/**
 * Builds a grid over `bounds` with the given step, coarsening it (×2 each time, up to
 * `maxStep`) while it would have more than `maxNodes` nodes. Returns null when even the
 * coarsest grid is too large.
 */
export function buildGrid(
  bounds: Bounds3,
  step: number,
  extras: { xs: number[]; ys: number[]; zs: number[] },
  maxNodes: number,
  maxStep: number,
): Grid | null {
  for (let s = Math.max(1, step); ; s *= 2) {
    const grid: Grid = {
      xs: axisCoords(bounds.minX, bounds.maxX, s, extras.xs),
      ys: axisCoords(bounds.minY, bounds.maxY, s, extras.ys),
      zs: axisCoords(bounds.minZ, bounds.maxZ, s, extras.zs),
      step: s,
    }
    if (nodeCount(grid) <= maxNodes) return grid
    if (s * 2 > Math.max(maxStep, step)) return null
  }
}
