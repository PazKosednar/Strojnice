import { describe, expect, it } from 'vitest'
import { validateOpening } from './openingValidation'
import type { Opening, Wall } from './scene'

const wall: Wall = {
  id: 'w1',
  start: { x: 0, y: 0 },
  end: { x: 3200, y: 0 },
  thickness: 200,
  height: 2600,
}

const opening = (patch: Partial<Opening> = {}): Opening => ({
  id: 'o1',
  wallId: 'w1',
  type: 'window',
  offset: 1000,
  width: 1200,
  height: 1200,
  sillHeight: 900,
  ...patch,
})

describe('validateOpening', () => {
  it('accepts an opening inside the wall', () => {
    expect(validateOpening(opening(), wall, [])).toBeNull()
  })

  it('accepts an opening touching both wall ends', () => {
    expect(validateOpening(opening({ offset: 0, width: 3200 }), wall, [])).toBeNull()
  })

  it('rejects non-integer or non-positive sizes', () => {
    expect(validateOpening(opening({ width: 0 }), wall, [])).toBe('invalidSize')
    expect(validateOpening(opening({ height: -5 }), wall, [])).toBe('invalidSize')
    expect(validateOpening(opening({ offset: 10.5 }), wall, [])).toBe('invalidSize')
    expect(validateOpening(opening({ offset: -1 }), wall, [])).toBe('invalidSize')
  })

  it('requires doors to have no sill', () => {
    expect(validateOpening(opening({ type: 'door', sillHeight: 100 }), wall, [])).toBe('doorSill')
    expect(
      validateOpening(opening({ type: 'door', sillHeight: 0, height: 2100 }), wall, []),
    ).toBeNull()
  })

  it('rejects an opening running past the wall end', () => {
    expect(validateOpening(opening({ offset: 2100 }), wall, [])).toBe('outsideWall')
  })

  it('rejects an opening higher than the wall', () => {
    expect(validateOpening(opening({ sillHeight: 1500 }), wall, [])).toBe('tooTall')
  })

  it('rejects overlap with another opening in the same wall', () => {
    const other = opening({ id: 'o2', offset: 2000, width: 800 })
    expect(validateOpening(opening(), wall, [other])).toBe('overlap')
  })

  it('allows openings that only touch', () => {
    const other = opening({ id: 'o2', offset: 2200, width: 800 })
    expect(validateOpening(opening(), wall, [other])).toBeNull()
  })

  it('ignores itself and openings in other walls', () => {
    const self = opening()
    const elsewhere = opening({ id: 'o3', wallId: 'w2' })
    expect(validateOpening(self, wall, [self, elsewhere])).toBeNull()
  })
})
