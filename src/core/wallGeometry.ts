import type { Point, Wall } from './scene'

/** Length of the wall axis in mm (may be fractional for slanted walls). */
export function wallLength(wall: Wall): number {
  return Math.hypot(wall.end.x - wall.start.x, wall.end.y - wall.start.y)
}

/** Axis angle in radians, counter-clockwise from +x, in (-π, π]. */
export function wallAngle(wall: Wall): number {
  return Math.atan2(wall.end.y - wall.start.y, wall.end.x - wall.start.x)
}

/** Unit vector from start to end; zero vector for a zero-length wall. */
export function wallDirection(wall: Wall): Point {
  const length = wallLength(wall)
  if (length === 0) return { x: 0, y: 0 }
  return { x: (wall.end.x - wall.start.x) / length, y: (wall.end.y - wall.start.y) / length }
}

/** Point on the wall axis at `offset` mm from the start (not rounded). */
export function pointAtOffset(wall: Wall, offset: number): Point {
  const d = wallDirection(wall)
  return { x: wall.start.x + d.x * offset, y: wall.start.y + d.y * offset }
}

/** Integer point at `distance` mm from `from` in direction `angle` (radians). */
export function pointAtDistance(from: Point, angle: number, distance: number): Point {
  return {
    x: Math.round(from.x + Math.cos(angle) * distance) + 0,
    y: Math.round(from.y + Math.sin(angle) * distance) + 0,
  }
}

/**
 * Projects a point onto the wall segment. Returns the distance along the axis from
 * the start (clamped to the segment) and the distance from the point to that projection.
 */
export function projectOntoWall(wall: Wall, point: Point): { along: number; distance: number } {
  const length = wallLength(wall)
  const d = wallDirection(wall)
  const raw = (point.x - wall.start.x) * d.x + (point.y - wall.start.y) * d.y
  const along = Math.min(Math.max(raw, 0), length)
  const px = wall.start.x + d.x * along
  const py = wall.start.y + d.y * along
  return { along, distance: Math.hypot(point.x - px, point.y - py) }
}
