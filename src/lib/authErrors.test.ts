import { describe, expect, it } from 'vitest'
import { authErrorMessage } from './authErrors'

describe('authErrorMessage', () => {
  it('translates known Supabase error codes', () => {
    expect(authErrorMessage({ code: 'invalid_credentials', message: 'x' })).toBe(
      'Napačen e-poštni naslov ali geslo.',
    )
    expect(authErrorMessage({ code: 'email_not_confirmed', message: 'x' })).toBe(
      'E-poštni naslov še ni potrjen. Preveri pošto in klikni povezavo za potrditev.',
    )
    expect(authErrorMessage({ code: 'user_already_exists', message: 'x' })).toBe(
      'Uporabnik s tem e-poštnim naslovom že obstaja.',
    )
  })

  it('falls back to a generic message that keeps the original text', () => {
    expect(authErrorMessage({ code: 'something_new', message: 'Boom' })).toBe(
      'Prišlo je do napake: Boom',
    )
    expect(authErrorMessage({ message: 'Boom' })).toBe('Prišlo je do napake: Boom')
  })
})
