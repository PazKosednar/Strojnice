import { equipmentFootprint } from '../core/equipmentGeometry'
import type { Point, Scene } from '../core/scene'
import { wallExtensions, wallOutline } from '../core/wallJoins'
import type { Rect } from './viewport'

/**
 * Plan bounds (mm) of everything drawn: wall bodies, equipment footprints (also equipment
 * outside the room, e.g. an outdoor unit) and pipe routes. Null for an empty scene.
 */
export function sceneBounds(scene: Scene): Rect | null {
  const extensions = wallExtensions(scene.walls)
  const points: Point[] = scene.walls.flatMap((w) => wallOutline(w, extensions.get(w.id)))
  for (const e of scene.equipment) {
    const footprint = equipmentFootprint(e)
    if (footprint.kind === 'polygon') points.push(...footprint.points)
    else {
      const { center, radius } = footprint
      points.push({ x: center.x - radius, y: center.y - radius })
      points.push({ x: center.x + radius, y: center.y + radius })
    }
  }
  for (const pipe of scene.pipes) points.push(...pipe.route)
  if (points.length === 0) return null
  return {
    minX: Math.min(...points.map((p) => p.x)),
    minY: Math.min(...points.map((p) => p.y)),
    maxX: Math.max(...points.map((p) => p.x)),
    maxY: Math.max(...points.map((p) => p.y)),
  }
}
