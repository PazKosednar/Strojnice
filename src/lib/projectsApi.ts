import { createEmptyScene } from '../core/scene'
import type { Database, Json } from './database.types'
import { getSupabase } from './supabase'

export type ProjectRow = Database['public']['Tables']['projects']['Row']

/** Project fields needed by the list; the scene is loaded only when opening a project. */
export type ProjectSummary = Pick<ProjectRow, 'id' | 'name' | 'created_at' | 'updated_at'>

const SUMMARY_COLUMNS = 'id, name, created_at, updated_at'

export async function listProjects(): Promise<ProjectSummary[]> {
  const { data, error } = await getSupabase()
    .from('projects')
    .select(SUMMARY_COLUMNS)
    .order('updated_at', { ascending: false })
  if (error) throw error
  return data
}

/** Creates a project with an empty scene. owner_id defaults to auth.uid() in the database. */
export async function createProject(name: string): Promise<ProjectSummary> {
  const scene = createEmptyScene() as unknown as Json
  const { data, error } = await getSupabase()
    .from('projects')
    .insert({ name: name.trim(), scene })
    .select(SUMMARY_COLUMNS)
    .single()
  if (error) throw error
  return data
}

export async function renameProject(id: string, name: string): Promise<ProjectSummary> {
  const { data, error } = await getSupabase()
    .from('projects')
    .update({ name: name.trim() })
    .eq('id', id)
    .select(SUMMARY_COLUMNS)
    .single()
  if (error) throw error
  return data
}

export async function deleteProject(id: string): Promise<void> {
  const { error } = await getSupabase().from('projects').delete().eq('id', id)
  if (error) throw error
}

/** Returns the project, or null when it does not exist or belongs to someone else (RLS). */
export async function getProject(id: string): Promise<ProjectRow | null> {
  const { data, error } = await getSupabase()
    .from('projects')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data
}
