import { describe, expect, it } from 'vitest'
import { createEmptyScene, SCENE_VERSION } from './scene'

describe('createEmptyScene', () => {
  it('creates a scene with the current version and millimetre units', () => {
    const scene = createEmptyScene()
    expect(scene.version).toBe(SCENE_VERSION)
    expect(scene.units).toBe('mm')
  })

  it('creates empty element lists', () => {
    expect(createEmptyScene()).toEqual({
      version: SCENE_VERSION,
      units: 'mm',
      walls: [],
      openings: [],
      equipment: [],
      pipes: [],
    })
  })

  it('returns a new, independent object on every call', () => {
    const a = createEmptyScene()
    const b = createEmptyScene()
    expect(a).not.toBe(b)
    expect(a.walls).not.toBe(b.walls)
  })

  it('is JSON round-trippable', () => {
    const scene = createEmptyScene()
    expect(JSON.parse(JSON.stringify(scene))).toEqual(scene)
  })
})
