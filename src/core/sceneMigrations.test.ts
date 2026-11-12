import { describe, expect, it } from 'vitest'
import { parseScene } from './parseScene'
import { INITIAL_SETTINGS, SCENE_VERSION } from './scene'
import { migrateScene } from './sceneMigrations'

/** A phase-1 scene exactly as stored in the database (version 1, no systems). */
const v1Scene = {
  version: 1,
  units: 'mm',
  settings: {
    wallThickness: 150,
    wallHeight: 2500,
    door: { width: 800, height: 2000, sillHeight: 0 },
    window: { width: 1000, height: 1100, sillHeight: 950 },
    gridSize: 25,
  },
  walls: [
    { id: 'w1', start: { x: 0, y: 0 }, end: { x: 3200, y: 0 }, thickness: 150, height: 2500 },
    { id: 'w2', start: { x: 3200, y: 0 }, end: { x: 3200, y: 1800 }, thickness: 150, height: 2500 },
  ],
  openings: [
    {
      id: 'o1',
      wallId: 'w1',
      type: 'window',
      offset: 400,
      width: 1000,
      height: 1100,
      sillHeight: 950,
    },
  ],
  equipment: [],
  pipes: [],
}

describe('migrateScene v1 -> v2', () => {
  it('bumps the version and adds the initial systems', () => {
    const migrated = migrateScene(v1Scene) as typeof v1Scene & {
      settings: { systems: unknown }
    }
    expect(migrated.version).toBe(2)
    expect(migrated.settings.systems).toEqual(INITIAL_SETTINGS.systems)
  })

  it('keeps walls, openings and the other settings unchanged', () => {
    const migrated = migrateScene(v1Scene) as typeof v1Scene
    expect(migrated.walls).toEqual(v1Scene.walls)
    expect(migrated.openings).toEqual(v1Scene.openings)
    expect(migrated.settings).toMatchObject(v1Scene.settings)
  })

  it('does not mutate the stored object', () => {
    const before = JSON.stringify(v1Scene)
    migrateScene(v1Scene)
    expect(JSON.stringify(v1Scene)).toBe(before)
  })

  it('gives a phase-0 scene without settings the initial settings', () => {
    const phase0 = { version: 1, units: 'mm', walls: [], openings: [], equipment: [], pipes: [] }
    expect((migrateScene(phase0) as { settings: unknown }).settings).toEqual(INITIAL_SETTINGS)
  })

  it('leaves current-version scenes and unknown values alone', () => {
    const current = { version: SCENE_VERSION, anything: true }
    expect(migrateScene(current)).toBe(current)
    expect(migrateScene(null)).toBeNull()
    expect(migrateScene('x')).toBe('x')
    const future = { version: 99 }
    expect(migrateScene(future)).toBe(future)
  })
})

describe('parseScene on a stored v1 scene', () => {
  it('upgrades it to the current version without losing data', () => {
    const result = parseScene(JSON.parse(JSON.stringify(v1Scene)))
    if (!result.ok) throw new Error(result.error)
    expect(result.scene).toEqual({
      ...v1Scene,
      version: SCENE_VERSION,
      settings: { ...v1Scene.settings, systems: INITIAL_SETTINGS.systems },
    })
  })
})
