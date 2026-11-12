import { describe, expect, it } from 'vitest'
import { createHistory, pushHistory, redo, replacePresent, undo } from './history'

describe('history', () => {
  it('undoes and redoes steps in order', () => {
    let h = createHistory('a')
    h = pushHistory(h, 'b')
    h = pushHistory(h, 'c')
    h = undo(h)
    expect(h.present).toBe('b')
    h = undo(h)
    expect(h.present).toBe('a')
    h = redo(h)
    expect(h.present).toBe('b')
    h = redo(h)
    expect(h.present).toBe('c')
  })

  it('ignores undo/redo at the ends', () => {
    const h = createHistory('a')
    expect(undo(h)).toBe(h)
    expect(redo(h)).toBe(h)
  })

  it('clears redo after a new step', () => {
    let h = pushHistory(createHistory('a'), 'b')
    h = undo(h)
    h = pushHistory(h, 'x')
    expect(h.future).toEqual([])
    expect(redo(h).present).toBe('x')
  })

  it('does not record the same state twice', () => {
    const h = createHistory('a')
    expect(pushHistory(h, 'a')).toBe(h)
  })

  it('limits the number of undo steps', () => {
    let h = createHistory(0)
    for (let i = 1; i <= 5; i++) h = pushHistory(h, i, 3)
    expect(h.past).toEqual([2, 3, 4])
  })

  it('replaces the present without a new step', () => {
    let h = pushHistory(createHistory('a'), 'b')
    h = replacePresent(h, 'b2')
    expect(h.present).toBe('b2')
    expect(undo(h).present).toBe('a')
  })
})
