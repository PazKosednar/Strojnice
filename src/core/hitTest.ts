import { equipmentFootprint, footprintContains } from './equipmentGeometry'
import { planBoxCorners } from './planBox'
import type { Equipment, Opening, PlanBox, Point, Scene, Wall } from './scene'
import { projectOntoWall } from './wallGeometry'

export interface WallHit {
  wall: Wall
  /** Distance along the wall axis from its start (mm). */
  along: number
}

/**
 * Finds the wall under a point: the nearest wall whose axis is within half its thickness
 * plus `tolerance` (mm). Returns null if none.
 */
export function findWallAt(
  walls: readonly Wall[],
  point: Point,
  tolerance: number,
): WallHit | null {
  let best: WallHit | null = null
  let bestDistance = Infinity
  for (const wall of walls) {
    const { along, distance } = projectOntoWall(wall, point)
    if (distance <= wall.thickness / 2 + tolerance && distance < bestDistance) {
      best = { wall, along }
      bestDistance = distance
    }
  }
  return best
}

/** Finds the opening under a point (on the hit wall, within its width). */
export function findOpeningAt(scene: Scene, point: Point, tolerance: number): Opening | null {
  const hit = findWallAt(scene.walls, point, tolerance)
  if (!hit) return null
  return (
    scene.openings.find(
      (o) =>
        o.wallId === hit.wall.id &&
        hit.along >= o.offset - tolerance &&
        hit.along <= o.offset + o.width + tolerance,
    ) ?? null
  )
}

/** Finds the equipment whose footprint contains the point (the last placed one wins). */
export function findEquipmentAt(equipment: readonly Equipment[], point: Point): Equipment | null {
  for (let i = equipment.length - 1; i >= 0; i--) {
    const item = equipment[i]!
    if (footprintContains(equipmentFootprint(item), point)) return item
  }
  return null
}

/** Finds the box (obstacle or zone) whose footprint contains the point (last one wins). */
export function findBoxAt<T extends PlanBox>(boxes: readonly T[], point: Point): T | null {
  for (let i = boxes.length - 1; i >= 0; i--) {
    const box = boxes[i]!
    if (footprintContains({ kind: 'polygon', points: planBoxCorners(box) }, point)) return box
  }
  return null
}
