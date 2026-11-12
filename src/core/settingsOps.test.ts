import { describe, expect, it } from 'vitest'
import { createEmptyScene } from './scene'
import { updateSettings } from './settingsOps'

describe('updateSettings', () => {
  it('updates selected values and keeps the rest', () => {
    const result = updateSettings(createEmptyScene(), { wallThickness: 120 })
    expect(result.ok && result.scene.settings.wallThickness).toBe(120)
    expect(result.ok && result.scene.settings.wallHeight).toBe(2600)
  })

  it('updates an opening preset', () => {
    const scene = createEmptyScene()
    const result = updateSettings(scene, { window: { ...scene.settings.window, width: 800 } })
    expect(result.ok && result.scene.settings.window.width).toBe(800)
  })

  it('forces a zero door sill', () => {
    const scene = createEmptyScene()
    const result = updateSettings(scene, {
      door: { width: 800, height: 2000, sillHeight: 300 },
    })
    expect(result.ok && result.scene.settings.door.sillHeight).toBe(0)
  })

  it('rejects non-positive or fractional values', () => {
    expect(updateSettings(createEmptyScene(), { gridSize: 0 })).toEqual({
      ok: false,
      error: 'invalidValue',
    })
    expect(updateSettings(createEmptyScene(), { wallHeight: 2500.5 })).toEqual({
      ok: false,
      error: 'invalidValue',
    })
  })
})
