import { describe, expect, it } from 'vitest'
import { readSupabaseConfig } from './env'

describe('readSupabaseConfig', () => {
  it('returns the config when both values are present', () => {
    expect(
      readSupabaseConfig({
        VITE_SUPABASE_URL: 'https://abc.supabase.co',
        VITE_SUPABASE_ANON_KEY: 'key',
      }),
    ).toEqual({ ok: true, url: 'https://abc.supabase.co', anonKey: 'key' })
  })

  it('trims whitespace around values', () => {
    expect(
      readSupabaseConfig({
        VITE_SUPABASE_URL: '  https://abc.supabase.co ',
        VITE_SUPABASE_ANON_KEY: ' key ',
      }),
    ).toEqual({ ok: true, url: 'https://abc.supabase.co', anonKey: 'key' })
  })

  it('lists every missing or empty variable', () => {
    expect(readSupabaseConfig({ VITE_SUPABASE_URL: ' ' })).toEqual({
      ok: false,
      missing: ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'],
    })
  })

  it('rejects a URL that is not http(s)', () => {
    expect(
      readSupabaseConfig({ VITE_SUPABASE_URL: 'abc.supabase.co', VITE_SUPABASE_ANON_KEY: 'key' }),
    ).toEqual({ ok: false, missing: ['VITE_SUPABASE_URL'] })
  })
})
