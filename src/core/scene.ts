/**
 * Scene model: the single source of truth for a project.
 *
 * The scene is stored as JSON. All lengths are integer millimetres.
 * The 2D plan and the 3D view are pure projections of this model and
 * never hold geometry state of their own.
 *
 * Plan coordinates: x grows to the right, y grows "up" in the plan (north).
 * Heights are measured from the finished floor (z = 0).
 */

/** Current scene schema version. Bump when the stored shape changes. */
export const SCENE_VERSION = 1

/** Length unit used throughout the scene. */
export type SceneUnits = 'mm'

/** Point in the plan, integer millimetres. */
export interface Point {
  x: number
  y: number
}

/**
 * Straight wall segment. The axis runs from `start` to `end`; the thickness is
 * split evenly on both sides of the axis. Walls are independent segments: a room
 * does not have to be a closed polygon. Adjacent walls share an endpoint coordinate.
 */
export interface Wall {
  id: string
  start: Point
  end: Point
  thickness: number
  height: number
}

export type OpeningType = 'door' | 'window'

/**
 * Opening in a wall. `offset` is measured along the wall axis from the wall start
 * to the near edge of the opening. Doors always have `sillHeight` 0.
 */
export interface Opening {
  id: string
  wallId: string
  type: OpeningType
  offset: number
  width: number
  height: number
  sillHeight: number
}

/** Placed equipment item. Defined in phase 2. */
export type Equipment = Record<string, never>

/** Pipe run between connection points. Defined in phase 3. */
export type Pipe = Record<string, never>

/** Size used for newly placed openings of one type. */
export interface OpeningPreset {
  width: number
  height: number
  sillHeight: number
}

/**
 * Per-project values used for newly created elements. These are user-editable
 * project settings, not standards.
 */
export interface SceneSettings {
  wallThickness: number
  wallHeight: number
  door: OpeningPreset
  window: OpeningPreset
  /** Grid and snap step. */
  gridSize: number
}

export interface Scene {
  version: number
  units: SceneUnits
  settings: SceneSettings
  walls: Wall[]
  openings: Opening[]
  equipment: Equipment[]
  pipes: Pipe[]
}

/**
 * Starting values for a new project's settings. Chosen as editable defaults
 * (the user changes them per project); they are not normative values.
 */
export const INITIAL_SETTINGS: SceneSettings = {
  wallThickness: 200,
  wallHeight: 2600,
  door: { width: 900, height: 2100, sillHeight: 0 },
  window: { width: 1200, height: 1200, sillHeight: 900 },
  gridSize: 50,
}

/** Returns a deep copy of the initial settings. */
export function initialSettings(): SceneSettings {
  return {
    ...INITIAL_SETTINGS,
    door: { ...INITIAL_SETTINGS.door },
    window: { ...INITIAL_SETTINGS.window },
  }
}

/** Returns a new, empty scene. */
export function createEmptyScene(settings: SceneSettings = initialSettings()): Scene {
  return {
    version: SCENE_VERSION,
    units: 'mm',
    settings,
    walls: [],
    openings: [],
    equipment: [],
    pipes: [],
  }
}

/** Generates unique element ids. Injected so that core functions stay pure. */
export type IdFactory = () => string
