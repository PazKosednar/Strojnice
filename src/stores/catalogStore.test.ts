import { afterEach, describe, expect, it, vi } from 'vitest'
import { boxType, cylinderType } from '../core/testFixtures'
import type { Catalog } from '../lib/equipmentTypesApi'
import { useCatalogStore } from './catalogStore'

vi.mock('../lib/equipmentTypesApi', () => ({
  listEquipmentTypes: vi.fn(),
  saveEquipmentType: vi.fn(),
  deleteEquipmentType: vi.fn(),
}))

const api = await import('../lib/equipmentTypesApi')
const store = () => useCatalogStore.getState()

describe('catalogStore', () => {
  afterEach(() => {
    store().reset()
    vi.mocked(api.listEquipmentTypes).mockReset()
    vi.mocked(api.saveEquipmentType).mockReset()
    vi.mocked(api.deleteEquipmentType).mockReset()
  })

  it('loads types sorted by name', async () => {
    vi.mocked(api.listEquipmentTypes).mockResolvedValue({
      types: [cylinderType, boxType],
      invalid: [],
    })
    await store().load()
    expect(store().status).toBe('ready')
    expect(store().types.map((t) => t.name)).toEqual(['Test box', 'Test cylinder'])
  })

  it('stays failed after a load error instead of going back to idle', async () => {
    vi.mocked(api.listEquipmentTypes).mockRejectedValue(new Error('no table'))
    await store().load()
    expect(store().status).toBe('failed')
    expect(store().error).toBe('Kataloga ni bilo mogoče naložiti: no table')
  })

  it('adds a saved type and replaces it when saved again', async () => {
    vi.mocked(api.saveEquipmentType).mockResolvedValue(undefined)
    expect(await store().save(boxType)).toBe(true)
    expect(await store().save({ ...boxType, name: 'Renamed' })).toBe(true)
    expect(store().types).toEqual([{ ...boxType, name: 'Renamed' }])
  })

  it('keeps the list and shows a Slovenian error when saving fails', async () => {
    vi.mocked(api.saveEquipmentType).mockRejectedValue(new Error('offline'))
    expect(await store().save(boxType)).toBe(false)
    expect(store().types).toEqual([])
    expect(store().error).toBe('Tipa ni bilo mogoče shraniti: offline')
  })

  it('removes a type', async () => {
    vi.mocked(api.saveEquipmentType).mockResolvedValue(undefined)
    vi.mocked(api.deleteEquipmentType).mockResolvedValue(undefined)
    await store().save(boxType)
    expect(await store().remove(boxType.id)).toBe(true)
    expect(store().types).toEqual([])
  })

  it('discards a load that finishes after reset (previous user)', async () => {
    let resolve!: (value: Catalog) => void
    vi.mocked(api.listEquipmentTypes).mockReturnValue(new Promise((r) => (resolve = r)))
    const pending = store().load()
    store().reset()
    resolve({ types: [boxType], invalid: [] })
    await pending
    expect(store().types).toEqual([])
    expect(store().status).toBe('idle')
  })
})
