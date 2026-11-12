import { footprintSize, normalizeRotation, rotationTrig } from './equipmentGeometry'
import type { EquipmentType, Point, Wall } from './scene'
import { projectOntoWall, wallDirection, wallLength } from './wallGeometry'

export interface EquipmentPlacement {
  position: Point
  rotation: number
  /** Wall the equipment is set against, or null for a free position. */
  wallId: string | null
}

export interface WallSnapOptions {
  /** Extra distance (mm) from the equipment-to-wall contact at which the snap engages. */
  tolerance: number
  /** Step along the wall (mm). */
  gridSize: number
}

/**
 * Sets the back of the equipment against the FACE of the nearest wall (axis ± thickness/2),
 * on the side of the wall where `cursor` is, and aligns the rotation with the wall.
 * The rotation is rounded to whole degrees; for slanted walls the distance from the face
 * is chosen so that the rotated footprint never enters the wall. Returns null when no wall
 * is close enough.
 */
export function snapEquipmentToWall(
  type: EquipmentType,
  cursor: Point,
  walls: readonly Wall[],
  options: WallSnapOptions,
): EquipmentPlacement | null {
  const { width, depth } = footprintSize(type)
  let best: { wall: Wall; along: number; distance: number } | null = null
  for (const wall of walls) {
    const { along, distance } = projectOntoWall(wall, cursor)
    const reach = wall.thickness / 2 + depth / 2 + options.tolerance
    if (distance <= reach && (!best || distance < best.distance)) best = { wall, along, distance }
  }
  if (!best) return null

  const { wall } = best
  const d = wallDirection(wall)
  const left = { x: -d.y, y: d.x }
  const side = (cursor.x - wall.start.x) * left.x + (cursor.y - wall.start.y) * left.y
  // Normal pointing from the wall towards the cursor side (left side when exactly on the axis).
  const n = side < 0 ? { x: -left.x, y: -left.y } : left

  // The local +y axis (back) must point into the wall: (-sin θ, cos θ) = -n.
  const rotation = normalizeRotation((Math.atan2(n.x, -n.y) * 180) / Math.PI)
  const { cos, sin } = rotationTrig(rotation)
  const support =
    type.shape.kind === 'cylinder'
      ? type.shape.diameter / 2
      : (width / 2) * Math.abs(cos * n.x + sin * n.y) +
        (depth / 2) * Math.abs(-sin * n.x + cos * n.y)

  const step = options.gridSize > 0 ? options.gridSize : 1
  const along = Math.min(Math.max(Math.round(best.along / step) * step, 0), wallLength(wall))
  const offset = wall.thickness / 2 + support
  return {
    position: {
      x: Math.round(wall.start.x + d.x * along + n.x * offset) + 0,
      y: Math.round(wall.start.y + d.y * along + n.y * offset) + 0,
    },
    rotation,
    wallId: wall.id,
  }
}
