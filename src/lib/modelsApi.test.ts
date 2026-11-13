import { describe, expect, it } from 'vitest'
import {
  asGlbBlob,
  GLB_MIME,
  modelObjectUrl,
  modelPath,
  publicModelUrl,
  safeFileName,
} from './modelsApi'

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

describe('public catalogue models', () => {
  it('are served from the app under its base path, without storage', async () => {
    expect(publicModelUrl('library/viessmann/a.glb', '/')).toBe('/library/viessmann/a.glb')
    expect(publicModelUrl('library/viessmann/a.glb', '/app')).toBe('/app/library/viessmann/a.glb')
    await expect(modelObjectUrl('library/viessmann/a.glb')).resolves.toBe(
      publicModelUrl('library/viessmann/a.glb'),
    )
    // React's use() needs the very same promise on every render.
    expect(modelObjectUrl('library/viessmann/a.glb')).toBe(
      modelObjectUrl('library/viessmann/a.glb'),
    )
  })
})

describe('asGlbBlob', () => {
  it('labels a file the browser reports as octet-stream as glTF binary, keeping its bytes', async () => {
    const file = new File([new Uint8Array([103, 108, 84, 70])], 'a.glb', {
      type: 'application/octet-stream',
    })
    const blob = asGlbBlob(file)
    expect(blob.type).toBe(GLB_MIME)
    expect(new Uint8Array(await blob.arrayBuffer())).toEqual(new Uint8Array([103, 108, 84, 70]))
  })

  it('keeps a file that already has the right type', () => {
    const file = new File(['x'], 'a.glb', { type: GLB_MIME })
    expect(asGlbBlob(file)).toBe(file)
  })
})
