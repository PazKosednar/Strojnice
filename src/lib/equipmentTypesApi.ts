import { parseEquipmentType } from '../core/equipmentType'
import type { EquipmentType } from '../core/scene'
import type { Database, Json } from './database.types'
import { getSupabase } from './supabase'

type EquipmentTypeRow = Database['public']['Tables']['equipment_types']['Row']
type StoredRow = Pick<EquipmentTypeRow, 'id' | 'name' | 'definition'>

/** A stored type whose definition could not be read (shown to the user, never used). */
export interface InvalidCatalogEntry {
  id: string
  name: string
  error: string
}

export interface Catalog {
  types: EquipmentType[]
  invalid: InvalidCatalogEntry[]
}

/**
 * Validates stored catalogue rows. The row id and name are authoritative (the definition
 * repeats them); rows with an unreadable definition are returned separately.
 */
export function rowsToCatalog(rows: readonly StoredRow[]): Catalog {
  const catalog: Catalog = { types: [], invalid: [] }
  for (const row of rows) {
    const definition =
      typeof row.definition === 'object' &&
      row.definition !== null &&
      !Array.isArray(row.definition)
        ? { ...row.definition, id: row.id, name: row.name }
        : row.definition
    const parsed = parseEquipmentType(definition)
    if (parsed.ok) catalog.types.push(parsed.type)
    else catalog.invalid.push({ id: row.id, name: row.name, error: parsed.error })
  }
  return catalog
}

/** Loads the signed-in user's equipment catalogue, sorted by name. */
export async function listEquipmentTypes(): Promise<Catalog> {
  const { data, error } = await getSupabase()
    .from('equipment_types')
    .select('id, name, definition')
    .order('name')
  if (error) throw error
  return rowsToCatalog(data)
}

/** Creates or updates a type. `type.id` must be a UUID (it is the row id). */
export async function saveEquipmentType(type: EquipmentType): Promise<void> {
  const { error } = await getSupabase()
    .from('equipment_types')
    .upsert({ id: type.id, name: type.name, definition: type as unknown as Json })
  if (error) throw error
}

export async function deleteEquipmentType(id: string): Promise<void> {
  const { error } = await getSupabase().from('equipment_types').delete().eq('id', id)
  if (error) throw error
}
