import { describe, expect, it } from 'vitest'
import { MIN_PASSWORD_LENGTH, validateCredentials, validateProjectName } from './validation'

describe('validateCredentials', () => {
  it('accepts a valid email and password', () => {
    expect(validateCredentials('ana@primer.si', 'a'.repeat(MIN_PASSWORD_LENGTH))).toBeNull()
  })

  it('requires an email', () => {
    expect(validateCredentials('  ', 'geslo123')).toBe('Vnesi e-poštni naslov.')
  })

  it('rejects a malformed email', () => {
    expect(validateCredentials('ana.primer.si', 'geslo123')).toBe('E-poštni naslov ni veljaven.')
  })

  it('requires a password', () => {
    expect(validateCredentials('ana@primer.si', '')).toBe('Vnesi geslo.')
  })

  it('enforces the minimum password length', () => {
    expect(validateCredentials('ana@primer.si', 'a'.repeat(MIN_PASSWORD_LENGTH - 1))).toBe(
      `Geslo mora imeti vsaj ${MIN_PASSWORD_LENGTH} znakov.`,
    )
  })
})

describe('validateProjectName', () => {
  it('accepts a normal name', () => {
    expect(validateProjectName('Strojnica Novak')).toBeNull()
  })

  it('rejects an empty or whitespace-only name', () => {
    expect(validateProjectName('   ')).toBe('Vnesi ime projekta.')
  })

  it('rejects names longer than 200 characters', () => {
    expect(validateProjectName('x'.repeat(201))).toBe(
      'Ime projekta je predolgo (največ 200 znakov).',
    )
  })
})
