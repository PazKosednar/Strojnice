import { describe, expect, it } from 'vitest'
import { createEmptyScene, INITIAL_SETTINGS, initialSettings, SCENE_VERSION } from './scene'

describe('createEmptyScene', () => {
  it('creates a scene with the current version and millimetre units', () => {
    const scene = createEmptyScene()
    expect(scene.version).toBe(SCENE_VERSION)
    expect(scene.units).toBe('mm')
  })

  it('creates empty element lists and initial settings', () => {
    expect(createEmptyScene()).toEqual({
      version: SCENE_VERSION,
      units: 'mm',
      settings: INITIAL_SETTINGS,
      walls: [],
      openings: [],
      equipment: [],
      terminals: [],
      pipes: [],
      obstacles: [],
      zones: [],
      rules: [],
    })
  })

  it('uses the given settings', () => {
    const settings = { ...initialSettings(), wallThickness: 120 }
    expect(createEmptyScene(settings).settings.wallThickness).toBe(120)
  })

  it('returns a new, independent object on every call', () => {
    const a = createEmptyScene()
    const b = createEmptyScene()
    expect(a).not.toBe(b)
    expect(a.walls).not.toBe(b.walls)
    expect(a.settings).not.toBe(b.settings)
    expect(a.settings.door).not.toBe(b.settings.door)
  })

  it('is JSON round-trippable', () => {
    const scene = createEmptyScene()
    expect(JSON.parse(JSON.stringify(scene))).toEqual(scene)
  })
})

describe('initial settings', () => {
  it('are integer millimetres and a door has no sill', () => {
    const s = INITIAL_SETTINGS
    const values = [
      s.wallThickness,
      s.wallHeight,
      s.gridSize,
      ...Object.values(s.door),
      ...Object.values(s.window),
    ]
    expect(values.every((v) => Number.isInteger(v) && v >= 0)).toBe(true)
    expect(s.door.sillHeight).toBe(0)
  })
})
