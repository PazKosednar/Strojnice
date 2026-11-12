import { describe, expect, it } from 'vitest'
import { draftTarget, editTypedLength, parseTypedLength } from './wallDrawing'

describe('parseTypedLength', () => {
  it('accepts positive integers only', () => {
    expect(parseTypedLength('1500')).toBe(1500)
    expect(parseTypedLength('')).toBeNull()
    expect(parseTypedLength('0')).toBeNull()
    expect(parseTypedLength('12a')).toBeNull()
  })
})

describe('editTypedLength', () => {
  it('appends digits and removes with Backspace', () => {
    expect(editTypedLength('15', '0')).toBe('150')
    expect(editTypedLength('150', 'Backspace')).toBe('15')
    expect(editTypedLength('', 'Backspace')).toBe('')
  })

  it('ignores keys that are not part of the length', () => {
    expect(editTypedLength('15', 'a')).toBeNull()
    expect(editTypedLength('15', 'Enter')).toBeNull()
  })

  it('limits the number of digits', () => {
    expect(editTypedLength('1234567', '8')).toBe('1234567')
  })
})

describe('draftTarget', () => {
  const start = { x: 1000, y: 0 }

  it('returns the cursor when nothing is typed', () => {
    expect(draftTarget(start, { x: 1800, y: 40 }, '')).toEqual({ x: 1800, y: 40 })
  })

  it('uses the typed length in the cursor direction', () => {
    expect(draftTarget(start, { x: 1000, y: 300 }, '1500')).toEqual({ x: 1000, y: 1500 })
    expect(draftTarget(start, { x: 400, y: 0 }, '1500')).toEqual({ x: -500, y: 0 })
  })

  it('defaults to +x when the cursor is on the start point', () => {
    expect(draftTarget(start, start, '1500')).toEqual({ x: 2500, y: 0 })
  })
})
