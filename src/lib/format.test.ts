import { describe, expect, it } from 'vitest'
import { formatDateTime } from './format'

describe('formatDateTime', () => {
  it('formats a valid ISO timestamp with the year', () => {
    expect(formatDateTime('2026-11-12T10:30:00Z')).toContain('2026')
  })

  it('returns the input unchanged when it is not a valid date', () => {
    expect(formatDateTime('ni-datum')).toBe('ni-datum')
  })
})
