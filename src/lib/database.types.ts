// Hand-written to match supabase/migrations. Replace with generated types
// (`supabase gen types typescript`) once the CLI is set up.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string
          owner_id: string
          name: string
          scene: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id?: string
          name: string
          scene: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          name?: string
          scene?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<never, never>
    Functions: Record<never, never>
    Enums: Record<never, never>
    CompositeTypes: Record<never, never>
  }
}
