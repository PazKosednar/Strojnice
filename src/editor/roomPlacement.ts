import type { Point, Scene } from '../core/scene'

/** Gap between an existing drawing and a newly added room (mm). */
const ROOM_GAP = 1000

/**
 * Bottom-left corner for a new rectangular room: the origin for an empty scene,
 * otherwise to the right of all existing walls, aligned to the grid.
 */
export function newRoomOrigin(scene: Scene): Point {
  if (scene.walls.length === 0) return { x: 0, y: 0 }
  const xs = scene.walls.flatMap((w) => [w.start.x, w.end.x])
  const ys = scene.walls.flatMap((w) => [w.start.y, w.end.y])
  const grid = scene.settings.gridSize
  return {
    x: Math.ceil((Math.max(...xs) + ROOM_GAP) / grid) * grid,
    y: Math.round(Math.min(...ys) / grid) * grid + 0,
  }
}
