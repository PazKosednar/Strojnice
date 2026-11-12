export type SupabaseConfig =
  { ok: true; url: string; anonKey: string } | { ok: false; missing: string[] }

type EnvSource = Partial<Record<string, string | undefined>>

/** Reads and validates Supabase settings from Vite env variables. */
export function readSupabaseConfig(env: EnvSource): SupabaseConfig {
  const url = env.VITE_SUPABASE_URL?.trim() ?? ''
  const anonKey = env.VITE_SUPABASE_ANON_KEY?.trim() ?? ''

  const missing: string[] = []
  if (!/^https?:\/\/\S+$/.test(url)) missing.push('VITE_SUPABASE_URL')
  if (anonKey === '') missing.push('VITE_SUPABASE_ANON_KEY')

  return missing.length === 0 ? { ok: true, url, anonKey } : { ok: false, missing }
}
