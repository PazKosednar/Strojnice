import type { EquipmentModel, ModelRotation } from './scene'

/** Model extents in the equipment frame after its rotation (mm): width (x), depth, height. */
export interface ModelDimensions {
  width: number
  depth: number
  height: number
}

/**
 * Size of a model as the equipment sees it: a quarter turn swaps width and depth.
 * Used to OFFER dimensions in the type form; the user confirms them.
 */
export function modelDimensions(
  bounds: EquipmentModel['bounds'],
  rotation: ModelRotation,
): ModelDimensions {
  const sx = bounds.max.x - bounds.min.x
  const sz = bounds.max.z - bounds.min.z
  const height = bounds.max.y - bounds.min.y
  const quarter = rotation === 90 || rotation === 270
  return { width: quarter ? sz : sx, depth: quarter ? sx : sz, height }
}

/**
 * Translation (mm, model axes) that puts the bottom centre of the model's bounds at the
 * origin, so the model stands where the equipment stands.
 */
export function modelOffset(bounds: EquipmentModel['bounds']): { x: number; y: number; z: number } {
  return {
    x: -(bounds.min.x + bounds.max.x) / 2 + 0,
    y: -bounds.min.y + 0,
    z: -(bounds.min.z + bounds.max.z) / 2 + 0,
  }
}
