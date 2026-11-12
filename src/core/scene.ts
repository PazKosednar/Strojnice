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
export const SCENE_VERSION = 2

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

/** Medium carried by pipes and ports (e.g. heating flow). Editable per project. */
export interface SystemDef {
  /** Stable id; the initial systems use the same ids in every project. */
  id: string
  name: string
  /** Display colour, `#rrggbb`. */
  color: string
}

/** Point in equipment-local or world space, integer millimetres. */
export interface Point3 {
  x: number
  y: number
  z: number
}

/** Axis direction in which a pipe leaves the equipment (equipment-local axes). */
export type PortDirection = '+x' | '-x' | '+y' | '-y' | '+z' | '-z'

/**
 * Connection point on an equipment type. `position` is in equipment-local coordinates:
 * origin at the centre of the footprint on the bottom face, x = width (to the right when
 * looking at the front), +y = back, -y = front, z = up.
 */
export interface Port {
  id: string
  name: string
  systemId: string
  position: Point3
  direction: PortDirection
  /** Free text from the manufacturer's documentation (e.g. "DN25"); never parsed. */
  size: string
}

export type EquipmentShape =
  | { kind: 'box'; width: number; depth: number; height: number }
  | { kind: 'cylinder'; diameter: number; height: number }

export type Mounting = 'floor' | 'wall'

/** Required free space around the equipment (mm); 0 = none on that side. */
export interface Clearances {
  front: number
  back: number
  /** Towards local -x. */
  left: number
  /** Towards local +x. */
  right: number
  top: number
}

/** Equipment definition from the user's catalogue. All dimensions are entered by the user. */
export interface EquipmentType {
  id: string
  name: string
  /** Prefix of automatically assigned tags, e.g. "HP" -> HP-01. */
  tagPrefix: string
  shape: EquipmentShape
  mounting: Mounting
  ports: Port[]
  clearances?: Clearances
}

/**
 * Equipment placed in the scene. `type` is a COPY of the catalogue type taken at placement,
 * so later catalogue edits never change an existing project. `tag` is an exact identifier:
 * unique in the project and never renumbered automatically.
 */
export interface Equipment {
  id: string
  tag: string
  type: EquipmentType
  /** Centre of the footprint in the plan. */
  position: Point
  /** Height of the bottom face above the floor. */
  elevation: number
  /** Whole degrees, counter-clockwise in the plan, 0-359. At 0 the front faces plan -y. */
  rotation: number
}

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
  /** Media used by ports (and pipes in phase 3). */
  systems: SystemDef[]
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
  systems: [
    { id: 'supply', name: 'Dvižni vod', color: '#d62728' },
    { id: 'return', name: 'Povratek', color: '#1f77b4' },
    { id: 'dhw', name: 'Topla sanitarna voda', color: '#ff7f0e' },
    { id: 'cold', name: 'Hladna voda', color: '#2ca02c' },
  ],
}

/** Returns a deep copy of the initial settings. */
export function initialSettings(): SceneSettings {
  return {
    ...INITIAL_SETTINGS,
    door: { ...INITIAL_SETTINGS.door },
    window: { ...INITIAL_SETTINGS.window },
    systems: INITIAL_SETTINGS.systems.map((system) => ({ ...system })),
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
