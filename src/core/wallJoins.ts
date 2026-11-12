import type { Point, Wall } from './scene'
import { wallDirection } from './wallGeometry'

export interface WallExtension {
  /** Extra length (mm) beyond the start point along the axis. */
  start: number
  /** Extra length (mm) beyond the end point along the axis. */
  end: number
}

const key = (p: Point) => `${p.x},${p.y}`

/**
 * For each wall, how far to extend each end so that walls meeting at a shared endpoint
 * close the corner (half the wall's own thickness). Free ends are not extended.
 */
export function wallExtensions(walls: readonly Wall[]): Map<string, WallExtension> {
  const counts = new Map<string, number>()
  for (const wall of walls) {
    if (wall.start.x === wall.end.x && wall.start.y === wall.end.y) continue
    for (const p of [wall.start, wall.end]) counts.set(key(p), (counts.get(key(p)) ?? 0) + 1)
  }
  const result = new Map<string, WallExtension>()
  for (const wall of walls) {
    const half = wall.thickness / 2
    result.set(wall.id, {
      start: (counts.get(key(wall.start)) ?? 0) > 1 ? half : 0,
      end: (counts.get(key(wall.end)) ?? 0) > 1 ? half : 0,
    })
  }
  return result
}

/**
 * Footprint of a wall as four corner points (counter-clockwise for a left-to-right wall):
 * start-right, end-right, end-left, start-left, including end extensions.
 */
export function wallOutline(wall: Wall, extension: WallExtension = { start: 0, end: 0 }): Point[] {
  const d = wallDirection(wall)
  const n = { x: -d.y, y: d.x }
  const half = wall.thickness / 2
  const s = { x: wall.start.x - d.x * extension.start, y: wall.start.y - d.y * extension.start }
  const e = { x: wall.end.x + d.x * extension.end, y: wall.end.y + d.y * extension.end }
  return [
    { x: s.x - n.x * half, y: s.y - n.y * half },
    { x: e.x - n.x * half, y: e.y - n.y * half },
    { x: e.x + n.x * half, y: e.y + n.y * half },
    { x: s.x + n.x * half, y: s.y + n.y * half },
  ]
}
