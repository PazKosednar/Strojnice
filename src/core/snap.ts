import type { Point, Wall } from './scene'
import { pointAtDistance } from './wallGeometry'

/** Rounds a point to the nearest grid step (or just to integers if the step is not positive). */
export function snapToGrid(point: Point, gridSize: number): Point {
  if (gridSize <= 0) return { x: Math.round(point.x) + 0, y: Math.round(point.y) + 0 }
  return {
    x: Math.round(point.x / gridSize) * gridSize + 0,
    y: Math.round(point.y / gridSize) * gridSize + 0,
  }
}

/** Nearest wall endpoint within `tolerance` mm, or null. */
export function snapToEndpoint(
  point: Point,
  walls: readonly Wall[],
  tolerance: number,
): Point | null {
  let best: Point | null = null
  let bestDistance = tolerance
  for (const wall of walls) {
    for (const candidate of [wall.start, wall.end]) {
      const distance = Math.hypot(candidate.x - point.x, candidate.y - point.y)
      if (distance <= bestDistance) {
        best = candidate
        bestDistance = distance
      }
    }
  }
  return best ? { ...best } : null
}

/**
 * Snaps `angle` to the nearest multiple of 90° relative to any of the reference angles,
 * if within `tolerance` (all radians). Returns null when nothing is close enough.
 */
export function snapAngle(
  angle: number,
  referenceAngles: readonly number[],
  tolerance: number,
): number | null {
  const quarter = Math.PI / 2
  let best: number | null = null
  let bestDiff = tolerance
  for (const reference of referenceAngles) {
    const steps = Math.round((angle - reference) / quarter)
    const candidate = reference + steps * quarter
    const diff = Math.abs(angle - candidate)
    if (diff <= bestDiff) {
      best = candidate
      bestDiff = diff
    }
  }
  return best
}

export interface SnapOptions {
  walls: readonly Wall[]
  gridSize: number
  /** Max distance (mm) for snapping to an existing endpoint. */
  endpointTolerance: number
  /** Max deviation (radians) for snapping to a right angle. */
  angleTolerance: number
  /** Previous point of the wall being drawn, if any. */
  from?: Point
  /** Direction (radians) of the previous wall in the chain, if any. */
  referenceAngle?: number
}

export type SnapKind = 'endpoint' | 'angle' | 'grid'

export interface SnapResult {
  point: Point
  kind: SnapKind
}

/**
 * Snaps a cursor point while drawing. Priority: existing endpoint, then a right angle
 * to the previous point (length rounded to the grid), then the grid.
 */
export function snapPoint(cursor: Point, options: SnapOptions): SnapResult {
  const endpoint = snapToEndpoint(cursor, options.walls, options.endpointTolerance)
  if (endpoint) return { point: endpoint, kind: 'endpoint' }

  const { from } = options
  if (from) {
    const dx = cursor.x - from.x
    const dy = cursor.y - from.y
    const references = options.referenceAngle === undefined ? [0] : [0, options.referenceAngle]
    const angle = snapAngle(Math.atan2(dy, dx), references, options.angleTolerance)
    if (angle !== null) {
      const projected = dx * Math.cos(angle) + dy * Math.sin(angle)
      const step = options.gridSize > 0 ? options.gridSize : 1
      const length = Math.round(projected / step) * step
      return { point: pointAtDistance(from, angle, length), kind: 'angle' }
    }
  }

  return { point: snapToGrid(cursor, options.gridSize), kind: 'grid' }
}
