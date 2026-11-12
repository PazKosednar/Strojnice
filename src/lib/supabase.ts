import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'
import { readSupabaseConfig } from './env'

export const supabaseConfig = readSupabaseConfig(import.meta.env)

let client: SupabaseClient<Database> | null = null

/** Shared Supabase client. Throws if env variables are missing (see .env.example). */
export function getSupabase(): SupabaseClient<Database> {
  if (!supabaseConfig.ok) {
    throw new Error(`Supabase is not configured. Missing: ${supabaseConfig.missing.join(', ')}`)
  }
  client ??= createClient<Database>(supabaseConfig.url, supabaseConfig.anonKey)
  return client
}
