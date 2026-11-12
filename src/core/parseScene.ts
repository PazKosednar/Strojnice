import { validateOpening } from './openingValidation'
import {
  initialSettings,
  SCENE_VERSION,
  type Opening,
  type OpeningPreset,
  type Point,
  type Scene,
  type SceneSettings,
  type Wall,
} from './scene'

export type ParseSceneResult = { ok: true; scene: Scene } | { ok: false; error: string }

/** Thrown internally with a path to the offending value; converted to a result. */
class SceneFormatError extends Error {}

type Obj = Record<string, unknown>

function obj(value: unknown, path: string): Obj {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new SceneFormatError(`${path}: expected an object`)
  }
  return value as Obj
}

function int(value: unknown, path: string, min: number): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min) {
    throw new SceneFormatError(`${path}: expected an integer >= ${min}`)
  }
  return value
}

function str(value: unknown, path: string): string {
  if (typeof value !== 'string' || value === '') {
    throw new SceneFormatError(`${path}: expected a non-empty string`)
  }
  return value
}

function arr(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) throw new SceneFormatError(`${path}: expected an array`)
  return value
}

function point(value: unknown, path: string): Point {
  const o = obj(value, path)
  return {
    x: int(o.x, `${path}.x`, Number.MIN_SAFE_INTEGER),
    y: int(o.y, `${path}.y`, Number.MIN_SAFE_INTEGER),
  }
}

function preset(value: unknown, path: string): OpeningPreset {
  const o = obj(value, path)
  return {
    width: int(o.width, `${path}.width`, 1),
    height: int(o.height, `${path}.height`, 1),
    sillHeight: int(o.sillHeight, `${path}.sillHeight`, 0),
  }
}

function settings(value: unknown): SceneSettings {
  // Scenes saved in phase 0 have no settings yet.
  if (value === undefined) return initialSettings()
  const o = obj(value, 'settings')
  return {
    wallThickness: int(o.wallThickness, 'settings.wallThickness', 1),
    wallHeight: int(o.wallHeight, 'settings.wallHeight', 1),
    door: preset(o.door, 'settings.door'),
    window: preset(o.window, 'settings.window'),
    gridSize: int(o.gridSize, 'settings.gridSize', 1),
  }
}

function wall(value: unknown, path: string): Wall {
  const o = obj(value, path)
  const w: Wall = {
    id: str(o.id, `${path}.id`),
    start: point(o.start, `${path}.start`),
    end: point(o.end, `${path}.end`),
    thickness: int(o.thickness, `${path}.thickness`, 1),
    height: int(o.height, `${path}.height`, 1),
  }
  if (w.start.x === w.end.x && w.start.y === w.end.y) {
    throw new SceneFormatError(`${path}: wall has zero length`)
  }
  return w
}

function opening(value: unknown, path: string): Opening {
  const o = obj(value, path)
  if (o.type !== 'door' && o.type !== 'window') {
    throw new SceneFormatError(`${path}.type: expected "door" or "window"`)
  }
  return {
    id: str(o.id, `${path}.id`),
    wallId: str(o.wallId, `${path}.wallId`),
    type: o.type,
    offset: int(o.offset, `${path}.offset`, 0),
    width: int(o.width, `${path}.width`, 1),
    height: int(o.height, `${path}.height`, 1),
    sillHeight: int(o.sillHeight, `${path}.sillHeight`, 0),
  }
}

function emptyList(value: unknown, path: string): [] {
  // Equipment and pipes are defined in later phases; only empty lists are known now.
  if (arr(value, path).length > 0) {
    throw new SceneFormatError(`${path}: not supported in this version`)
  }
  return []
}

function uniqueIds(items: readonly { id: string }[], path: string) {
  const seen = new Set<string>()
  for (const item of items) {
    if (seen.has(item.id)) throw new SceneFormatError(`${path}: duplicate id "${item.id}"`)
    seen.add(item.id)
  }
}

function parse(json: unknown): Scene {
  const root = obj(json, 'scene')
  if (root.version !== SCENE_VERSION) {
    throw new SceneFormatError(`version: unsupported scene version ${String(root.version)}`)
  }
  if (root.units !== 'mm') throw new SceneFormatError('units: expected "mm"')

  const walls = arr(root.walls, 'walls').map((w, i) => wall(w, `walls[${i}]`))
  const openings = arr(root.openings, 'openings').map((o, i) => opening(o, `openings[${i}]`))
  uniqueIds([...walls, ...openings], 'ids')

  openings.forEach((o, i) => {
    const host = walls.find((w) => w.id === o.wallId)
    if (!host) throw new SceneFormatError(`openings[${i}].wallId: unknown wall "${o.wallId}"`)
    const error = validateOpening(o, host, openings)
    if (error) throw new SceneFormatError(`openings[${i}]: ${error}`)
  })

  return {
    version: SCENE_VERSION,
    units: 'mm',
    settings: settings(root.settings),
    walls,
    openings,
    equipment: emptyList(root.equipment, 'equipment'),
    pipes: emptyList(root.pipes, 'pipes'),
  }
}

/**
 * Validates stored JSON and returns a typed scene. Invalid or unknown data is rejected
 * with a message naming the offending field instead of crashing the app.
 */
export function parseScene(json: unknown): ParseSceneResult {
  try {
    return { ok: true, scene: parse(json) }
  } catch (err) {
    if (err instanceof SceneFormatError) return { ok: false, error: err.message }
    throw err
  }
}
