import { describe, expect, it } from 'vitest'
import { modelPath, safeFileName } from './modelsApi'

describe('safeFileName', () => {
  it('keeps simple names', () => {
    expect(safeFileName('Vitocal-250-A_IDU-A.glb')).toBe('Vitocal-250-A_IDU-A.glb')
  })

  it('removes folders, spaces, diacritics and other characters', () => {
    expect(safeFileName('../../Notranja enota č.glb')).toBe('Notranja_enota_c.glb')
    expect(safeFileName('a/b\\c.glb')).toBe('a_b_c.glb')
  })

  it('always ends in .glb and stays short', () => {
    expect(safeFileName('model')).toBe('model.glb')
    expect(safeFileName(`${'x'.repeat(300)}.glb`).length).toBeLessThanOrEqual(100)
  })
})

describe('modelPath', () => {
  it('puts the file in the user and type folder', () => {
    expect(modelPath('u-1', 't-1', 'My model.glb')).toBe('u-1/t-1/My_model.glb')
  })
})
