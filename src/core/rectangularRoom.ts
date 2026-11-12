import type { IdFactory, Point, SceneSettings, Wall } from './scene'

/**
 * Creates four walls whose axes form a `width` × `depth` rectangle (mm), counter-clockwise
 * from `origin` (bottom-left corner). Adjacent walls share corner coordinates.
 * Throws RangeError for non-positive or non-integer dimensions.
 */
export function createRectangularRoom(
  width: number,
  depth: number,
  settings: Pick<SceneSettings, 'wallThickness' | 'wallHeight'>,
  newId: IdFactory,
  origin: Point = { x: 0, y: 0 },
): Wall[] {
  if (!Number.isInteger(width) || !Number.isInteger(depth) || width <= 0 || depth <= 0) {
    throw new RangeError('Room width and depth must be positive integers (mm).')
  }
  const corners: Point[] = [
    { x: origin.x, y: origin.y },
    { x: origin.x + width, y: origin.y },
    { x: origin.x + width, y: origin.y + depth },
    { x: origin.x, y: origin.y + depth },
  ]
  return corners.map((start, i) => ({
    id: newId(),
    start: { ...start },
    end: { ...corners[(i + 1) % corners.length]! },
    thickness: settings.wallThickness,
    height: settings.wallHeight,
  }))
}
