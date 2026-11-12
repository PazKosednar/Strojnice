import { describe, expect, it } from 'vitest'
import { parseScene } from './parseScene'
import { INITIAL_SETTINGS, SCENE_VERSION } from './scene'
import { migrateScene } from './sceneMigrations'

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

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

/** A phase-2 scene as stored (version 2: systems without line styles, no terminals). */
const v2Scene = {
  version: 2,
  units: 'mm',
  settings: {
    ...v1Scene.settings,
    systems: [
      { id: 'supply', name: 'Ogrevanje', color: '#aa0000' },
      { id: 'return', name: 'Povratek', color: '#1f77b4' },
      { id: 'gas', name: 'Plin', color: '#ffcc00' },
    ],
  },
  walls: v1Scene.walls,
  openings: v1Scene.openings,
  equipment: [
    {
      id: 'e1',
      tag: 'CYL-01',
      type: {
        id: 't1',
        name: 'Hranilnik',
        tagPrefix: 'CYL',
        shape: { kind: 'cylinder', diameter: 600, height: 1600 },
        mounting: 'floor',
        ports: [
          {
            id: 'p1',
            name: 'Hladna voda',
            systemId: 'cold',
            position: { x: 0, y: -300, z: 200 },
            direction: '-y',
            size: 'G 3/4',
          },
        ],
      },
      position: { x: 1000, y: 400 },
      elevation: 0,
      rotation: 180,
    },
  ],
  pipes: [],
}

const routingDefaults = {
  routingGrid: INITIAL_SETTINGS.routingGrid,
  portStraight: INITIAL_SETTINGS.portStraight,
  pipeSpacing: INITIAL_SETTINGS.pipeSpacing,
}

describe('migrateScene v1 -> current', () => {
  it('reaches the current version with the initial systems and routing settings', () => {
    const migrated = migrateScene(v1Scene) as { version: number; settings: object }
    expect(migrated.version).toBe(SCENE_VERSION)
    expect(migrated.settings).toEqual({
      ...v1Scene.settings,
      systems: INITIAL_SETTINGS.systems,
      ...routingDefaults,
    })
  })

  it('keeps walls and openings unchanged and adds empty terminals', () => {
    const migrated = migrateScene(v1Scene) as typeof v1Scene & { terminals: unknown }
    expect(migrated.walls).toEqual(v1Scene.walls)
    expect(migrated.openings).toEqual(v1Scene.openings)
    expect(migrated.terminals).toEqual([])
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

describe('migrateScene v2 -> v3', () => {
  it('adds line styles, keeping names and colours the user edited', () => {
    const migrated = migrateScene(clone(v2Scene)) as { settings: { systems: unknown } }
    expect(migrated.settings.systems).toEqual([
      { id: 'supply', name: 'Ogrevanje', color: '#aa0000', lineStyle: 'solid' },
      { id: 'return', name: 'Povratek', color: '#1f77b4', lineStyle: 'dashed' },
      { id: 'gas', name: 'Plin', color: '#ffcc00', lineStyle: 'solid' },
    ])
  })

  it('adds routing settings and terminals, and keeps placed equipment unchanged', () => {
    const migrated = migrateScene(clone(v2Scene)) as typeof v2Scene & {
      terminals: unknown
      settings: Record<string, unknown>
    }
    expect(migrated.version).toBe(3)
    expect(migrated.settings).toMatchObject(routingDefaults)
    expect(migrated.terminals).toEqual([])
    expect(migrated.equipment).toEqual(v2Scene.equipment)
  })
})

describe('parseScene on stored older scenes', () => {
  it('upgrades a v1 scene without losing data', () => {
    const result = parseScene(clone(v1Scene))
    if (!result.ok) throw new Error(result.error)
    expect(result.scene).toEqual({
      ...v1Scene,
      version: SCENE_VERSION,
      settings: { ...v1Scene.settings, systems: INITIAL_SETTINGS.systems, ...routingDefaults },
      terminals: [],
    })
  })

  it('upgrades a v2 scene with equipment; ports keep having no outer diameter', () => {
    const result = parseScene(clone(v2Scene))
    if (!result.ok) throw new Error(result.error)
    expect(result.scene.equipment).toEqual(v2Scene.equipment)
    expect(result.scene.equipment[0]!.type.ports[0]!.outerDiameter).toBeUndefined()
    expect(result.scene.walls).toEqual(v2Scene.walls)
    expect(result.scene.openings).toEqual(v2Scene.openings)
  })
})
