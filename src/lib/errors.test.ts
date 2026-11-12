import { describe, expect, it } from 'vitest'
import { actionErrorMessage } from './errors'

describe('actionErrorMessage', () => {
  it('appends the error message when available', () => {
    expect(actionErrorMessage('Shranjevanje ni uspelo', new Error('timeout'))).toBe(
      'Shranjevanje ni uspelo: timeout',
    )
    expect(actionErrorMessage('Ni uspelo', { message: 'RLS' })).toBe('Ni uspelo: RLS')
  })

  it('returns only the action when there is no message', () => {
    expect(actionErrorMessage('Ni uspelo', null)).toBe('Ni uspelo')
    expect(actionErrorMessage('Ni uspelo', 42)).toBe('Ni uspelo')
    expect(actionErrorMessage('Ni uspelo', { message: '' })).toBe('Ni uspelo')
  })
})
