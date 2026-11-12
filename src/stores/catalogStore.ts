import { create } from 'zustand'
import type { EquipmentType } from '../core/scene'
import {
  deleteEquipmentType,
  listEquipmentTypes,
  saveEquipmentType,
  type InvalidCatalogEntry,
} from '../lib/equipmentTypesApi'
import { actionErrorMessage } from '../lib/errors'

type CatalogStatus = 'idle' | 'loading' | 'ready'

interface CatalogState {
  status: CatalogStatus
  /** The user's equipment types, sorted by name. */
  types: EquipmentType[]
  /** Stored types that could not be read. */
  invalid: InvalidCatalogEntry[]
  /** Slovenian message of the last failed action. */
  error: string | null
  load: () => Promise<void>
  /** Creates or updates a type. */
  save: (type: EquipmentType) => Promise<boolean>
  remove: (id: string) => Promise<boolean>
  /** Clears everything, e.g. when the signed-in user changes. */
  reset: () => void
}

// Incremented by reset(); responses of requests started before a reset are discarded,
// so a slow request of a previous user can never repopulate the catalogue.
let epoch = 0

const byName = (a: EquipmentType, b: EquipmentType) => a.name.localeCompare(b.name, 'sl')

export const useCatalogStore = create<CatalogState>()((set) => ({
  status: 'idle',
  types: [],
  invalid: [],
  error: null,

  load: async () => {
    const started = epoch
    set({ status: 'loading', error: null })
    try {
      const catalog = await listEquipmentTypes()
      if (started !== epoch) return
      set({ types: [...catalog.types].sort(byName), invalid: catalog.invalid, status: 'ready' })
    } catch (err) {
      if (started !== epoch) return
      set({ status: 'idle', error: actionErrorMessage('Kataloga ni bilo mogoče naložiti', err) })
    }
  },

  save: async (type) => {
    const started = epoch
    try {
      await saveEquipmentType(type)
      if (started !== epoch) return false
      set((s) => ({
        types: [...s.types.filter((t) => t.id !== type.id), type].sort(byName),
        error: null,
      }))
      return true
    } catch (err) {
      if (started === epoch) {
        set({ error: actionErrorMessage('Tipa ni bilo mogoče shraniti', err) })
      }
      return false
    }
  },

  remove: async (id) => {
    const started = epoch
    try {
      await deleteEquipmentType(id)
      if (started !== epoch) return false
      set((s) => ({
        types: s.types.filter((t) => t.id !== id),
        invalid: s.invalid.filter((t) => t.id !== id),
        error: null,
      }))
      return true
    } catch (err) {
      if (started === epoch) {
        set({ error: actionErrorMessage('Tipa ni bilo mogoče izbrisati', err) })
      }
      return false
    }
  },

  reset: () => {
    epoch += 1
    set({ status: 'idle', types: [], invalid: [], error: null })
  },
}))
