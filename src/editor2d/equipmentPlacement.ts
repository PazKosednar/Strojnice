import { normalizeRotation } from '../core/equipmentGeometry'
import { snapEquipmentToWall, type EquipmentPlacement } from '../core/equipmentSnap'
import type { EquipmentType, Point, Scene } from '../core/scene'
import { snapToGrid } from '../core/snap'

export interface PlacementOptions {
  /** Distance (mm) from a wall at which the equipment snaps to it. */
  snapDistance: number
  /** True (Alt held): no snapping at all, only whole millimetres. */
  free: boolean
  /** Rotation used when the equipment is not set against a wall. */
  rotation: number
}

/**
 * Where equipment of `type` goes when its centre is dragged to `point`: against the
 * nearest wall if one is close, otherwise on the grid with the given rotation.
 */
export function placementAt(
  type: EquipmentType,
  point: Point,
  scene: Scene,
  options: PlacementOptions,
): EquipmentPlacement {
  const rotation = normalizeRotation(options.rotation)
  if (options.free) return { position: snapToGrid(point, 1), rotation, wallId: null }
  const { gridSize } = scene.settings
  return (
    snapEquipmentToWall(type, point, scene.walls, {
      tolerance: options.snapDistance,
      gridSize,
    }) ?? { position: snapToGrid(point, gridSize), rotation, wallId: null }
  )
}
