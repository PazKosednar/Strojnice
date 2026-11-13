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
export const SCENE_VERSION = 4

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
/** How pipes of a system are drawn in the 2D plan. */
export type LineStyle = 'solid' | 'dashed' | 'dashdot'

export interface SystemDef {
  /** Stable id; the initial systems use the same ids in every project. */
  id: string
  name: string
  /** Display colour, `#rrggbb`. */
  color: string
  lineStyle: LineStyle
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
  /**
   * Outer diameter of the connected pipe (mm), entered by the user. Never derived from
   * `size`. A port without it cannot be connected.
   */
  outerDiameter?: number
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

/** Turn of a 3D model about the vertical axis so that its front faces the equipment front. */
export type ModelRotation = 0 | 90 | 180 | 270

/**
 * Manufacturer 3D model (glTF binary) attached to an equipment type. The file lies in the
 * user's private storage; `bounds` are the model's extents (mm, model axes: x right, y up,
 * z towards the viewer) measured when it was uploaded. The model is drawn instead of the
 * box or cylinder, its bottom centre at the equipment origin, turned by `rotation` degrees.
 * It is only a picture: dimensions, ports and clearances still come from the type.
 */
export interface EquipmentModel {
  /** Storage path: `<user id>/<type id>/<file name>.glb`. */
  path: string
  fileName: string
  rotation: ModelRotation
  bounds: { min: Point3; max: Point3 }
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
  model?: EquipmentModel
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

/**
 * Pipe connection through a wall to a distribution network that is not drawn
 * (e.g. the building's cold-water main). `offset` is measured along the wall axis from
 * the wall start, `height` above the floor; the connection point lies on the wall axis.
 */
export interface WallTerminal {
  id: string
  /** Exact identifier like equipment tags (e.g. IZ-01); unique together with them. */
  tag: string
  wallId: string
  offset: number
  height: number
  systemId: string
  outerDiameter: number
}

/** One end of a pipe. */
export type PipeEnd =
  { kind: 'port'; equipmentId: string; portId: string } | { kind: 'terminal'; terminalId: string }

/** Point in plan coordinates with height (z above the floor), integer millimetres. */
export type RoutePoint = Point3

/**
 * Pipe between two ends of the same system. `route` runs from `from` to `to` and contains
 * only the corner points of axis-parallel segments; it is empty when no route was found
 * (`routeError` says why). 'auto' pipes are re-routed when their ends move, 'manual'
 * pipes are never changed automatically.
 */
export interface Pipe {
  id: string
  systemId: string
  from: PipeEnd
  to: PipeEnd
  outerDiameter: number
  route: RoutePoint[]
  mode: 'auto' | 'manual'
  /** Slovenian reason shown when automatic routing failed. */
  routeError?: string
}

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
  /** Media used by ports and pipes. */
  systems: SystemDef[]
  /** Step of the 3D grid used by automatic routing. */
  routingGrid: number
  /** Straight run of a pipe out of a port / into a port before the first bend. */
  portStraight: number
  /** Clear gap between the outer surfaces of neighbouring pipes. */
  pipeSpacing: number
}

export interface Scene {
  version: number
  units: SceneUnits
  settings: SceneSettings
  walls: Wall[]
  openings: Opening[]
  equipment: Equipment[]
  terminals: WallTerminal[]
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
    { id: 'supply', name: 'Dvižni vod', color: '#d62728', lineStyle: 'solid' },
    { id: 'return', name: 'Povratek', color: '#1f77b4', lineStyle: 'dashed' },
    { id: 'dhw', name: 'Topla sanitarna voda', color: '#ff7f0e', lineStyle: 'dashdot' },
    { id: 'cold', name: 'Hladna voda', color: '#2ca02c', lineStyle: 'solid' },
  ],
  routingGrid: 50,
  portStraight: 100,
  pipeSpacing: 50,
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
    terminals: [],
    pipes: [],
  }
}

/** Generates unique element ids. Injected so that core functions stay pure. */
export type IdFactory = () => string
