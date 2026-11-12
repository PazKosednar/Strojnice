/**
 * Scene model: the single source of truth for a project.
 *
 * The scene is stored as JSON. All lengths are integer millimetres.
 * The 2D plan and the 3D view are pure projections of this model and
 * never hold geometry state of their own.
 *
 * Element types are placeholders in phase 0; they are defined in later phases.
 */

/** Current scene schema version. Bump when the stored shape changes. */
export const SCENE_VERSION = 1

/** Length unit used throughout the scene. */
export type SceneUnits = 'mm'

/** Wall segment. Defined in phase 1. */
export type Wall = Record<string, never>

/** Opening in a wall (door, window). Defined in phase 1. */
export type Opening = Record<string, never>

/** Placed equipment item. Defined in phase 2. */
export type Equipment = Record<string, never>

/** Pipe run between connection points. Defined in phase 3. */
export type Pipe = Record<string, never>

export interface Scene {
  version: number
  units: SceneUnits
  walls: Wall[]
  openings: Opening[]
  equipment: Equipment[]
  pipes: Pipe[]
}

/** Returns a new, empty scene. */
export function createEmptyScene(): Scene {
  return {
    version: SCENE_VERSION,
    units: 'mm',
    walls: [],
    openings: [],
    equipment: [],
    pipes: [],
  }
}
