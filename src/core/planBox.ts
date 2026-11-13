import { localRect, normalizeRotation } from './equipmentGeometry'
import { MAX_COORDINATE } from './parseHelpers'
import type { PlanBox, Point } from './scene'

const isCoord = (v: number) => Number.isInteger(v) && Math.abs(v) <= MAX_COORDINATE
const isSize = (v: number) => Number.isInteger(v) && v > 0 && v <= MAX_COORDINATE

/** True when all values are whole mm: positive sizes, rotation 0-359, bottom ≥ 0. */
export function isValidPlanBox(box: PlanBox): boolean {
  return (
    isCoord(box.center.x) &&
    isCoord(box.center.y) &&
    isSize(box.width) &&
    isSize(box.depth) &&
    isSize(box.height) &&
    Number.isInteger(box.rotation) &&
    box.rotation >= 0 &&
    box.rotation <= 359 &&
    isCoord(box.bottom) &&
    box.bottom >= 0
  )
}

/** Box values rounded to whole mm and rotation normalised (input from drawing or forms). */
export function normalizedPlanBox<T extends PlanBox>(box: T): T {
  return {
    ...box,
    center: { x: Math.round(box.center.x) + 0, y: Math.round(box.center.y) + 0 },
    width: Math.round(box.width),
    depth: Math.round(box.depth),
    height: Math.round(box.height),
    bottom: Math.round(box.bottom) + 0,
    rotation: normalizeRotation(Math.round(box.rotation)),
  }
}

/** Corners of the footprint in the plan (counter-clockwise). */
export function planBoxCorners(box: PlanBox): Point[] {
  return localRect(
    { position: box.center, rotation: box.rotation },
    -box.width / 2,
    -box.depth / 2,
    box.width / 2,
    box.depth / 2,
  )
}

/**
 * Box from two opposite corners drawn in the plan (axis-aligned, rotation 0), spanning
 * from `bottom` to `bottom + height`.
 */
export function planBoxFromCorners(a: Point, b: Point, bottom: number, height: number): PlanBox {
  return normalizedPlanBox({
    center: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
    width: Math.abs(b.x - a.x),
    depth: Math.abs(b.y - a.y),
    rotation: 0,
    bottom,
    height,
  })
}
