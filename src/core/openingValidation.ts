import type { Opening, Wall } from './scene'
import { wallLength } from './wallGeometry'

export type OpeningError =
  /** Width/height must be positive integers, offset/sill non-negative integers. */
  | 'invalidSize'
  /** Doors must start at the floor. */
  | 'doorSill'
  /** The opening extends past the wall end. */
  | 'outsideWall'
  /** Sill + height is higher than the wall. */
  | 'tooTall'
  /** Overlaps another opening in the same wall. */
  | 'overlap'

const isNonNegativeInt = (v: number) => Number.isInteger(v) && v >= 0
const isPositiveInt = (v: number) => Number.isInteger(v) && v > 0

/**
 * Checks that an opening fits its wall and does not overlap other openings of that wall.
 * `others` may include the opening itself (matched by id) and openings of other walls.
 */
export function validateOpening(
  opening: Opening,
  wall: Wall,
  others: readonly Opening[],
): OpeningError | null {
  if (
    !isPositiveInt(opening.width) ||
    !isPositiveInt(opening.height) ||
    !isNonNegativeInt(opening.offset) ||
    !isNonNegativeInt(opening.sillHeight)
  ) {
    return 'invalidSize'
  }
  if (opening.type === 'door' && opening.sillHeight !== 0) return 'doorSill'
  // Small epsilon: slanted walls have fractional lengths.
  if (opening.offset + opening.width > wallLength(wall) + 1e-6) return 'outsideWall'
  if (opening.sillHeight + opening.height > wall.height) return 'tooTall'

  const start = opening.offset
  const end = opening.offset + opening.width
  const overlaps = others.some(
    (o) =>
      o.id !== opening.id &&
      o.wallId === opening.wallId &&
      o.offset < end &&
      start < o.offset + o.width,
  )
  return overlaps ? 'overlap' : null
}
