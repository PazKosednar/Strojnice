import { describe, expect, it } from 'vitest'
import { isTagFree, nextTag } from './tags'

describe('nextTag', () => {
  it('starts at 01', () => {
    expect(nextTag('HP', [])).toBe('HP-01')
  })

  it('continues after the highest number of the same prefix', () => {
    expect(nextTag('CYL', ['CYL-01', 'CYL-02', 'HP-07'])).toBe('CYL-03')
  })

  it('does not reuse a freed number while a higher one exists', () => {
    expect(nextTag('CYL', ['CYL-02'])).toBe('CYL-03')
  })

  it('ignores tags that only look similar', () => {
    expect(nextTag('HP', ['HPX-05', 'HP-A', 'hp-09', 'HP-03b'])).toBe('HP-01')
  })

  it('goes past 99', () => {
    expect(nextTag('EV', ['EV-99'])).toBe('EV-100')
  })

  it('handles prefixes with special characters', () => {
    expect(nextTag('T.Č', ['T.Č-01', 'TXČ-05'])).toBe('T.Č-02')
  })
})

describe('isTagFree', () => {
  const items = [
    { id: 'a', tag: 'HP-01' },
    { id: 'b', tag: 'CYL-01' },
  ]

  it('compares tags exactly', () => {
    expect(isTagFree(items, 'HP-01')).toBe(false)
    expect(isTagFree(items, 'hp-01')).toBe(true)
    expect(isTagFree(items, 'HP-02')).toBe(true)
  })

  it('lets an item keep its own tag', () => {
    expect(isTagFree(items, 'HP-01', 'a')).toBe(true)
    expect(isTagFree(items, 'HP-01', 'b')).toBe(false)
  })
})
