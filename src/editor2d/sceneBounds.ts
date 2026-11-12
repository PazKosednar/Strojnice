import type { Scene } from '../core/scene'
import { wallExtensions, wallOutline } from '../core/wallJoins'
import type { Rect } from './viewport'

/** Plan bounds of all wall bodies (mm), or null for an empty scene. */
export function sceneBounds(scene: Scene): Rect | null {
  if (scene.walls.length === 0) return null
  const extensions = wallExtensions(scene.walls)
  const points = scene.walls.flatMap((w) => wallOutline(w, extensions.get(w.id)))
  return {
    minX: Math.min(...points.map((p) => p.x)),
    minY: Math.min(...points.map((p) => p.y)),
    maxX: Math.max(...points.map((p) => p.x)),
    maxY: Math.max(...points.map((p) => p.y)),
  }
}
