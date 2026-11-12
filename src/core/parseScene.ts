import { readEquipmentType } from './equipmentType'
import { validateOpening } from './openingValidation'
import { arr, int, obj, oneOf, point, SceneFormatError, str, uniqueIds } from './parseHelpers'
import {
  SCENE_VERSION,
  type Equipment,
  type Opening,
  type OpeningPreset,
  type Scene,
  type SceneSettings,
  type SystemDef,
  type Wall,
} from './scene'
import { migrateScene } from './sceneMigrations'

export type ParseSceneResult = { ok: true; scene: Scene } | { ok: false; error: string }

function preset(value: unknown, path: string): OpeningPreset {
  const o = obj(value, path)
  return {
    width: int(o.width, `${path}.width`, 1),
    height: int(o.height, `${path}.height`, 1),
    sillHeight: int(o.sillHeight, `${path}.sillHeight`, 0),
  }
}

function system(value: unknown, path: string): SystemDef {
  const o = obj(value, path)
  const color = str(o.color, `${path}.color`)
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) {
    throw new SceneFormatError(`${path}.color: expected a colour like "#1f77b4"`)
  }
  return { id: str(o.id, `${path}.id`), name: str(o.name, `${path}.name`), color }
}

function settings(value: unknown): SceneSettings {
  const o = obj(value, 'settings')
  const systems = arr(o.systems, 'settings.systems').map((s, i) =>
    system(s, `settings.systems[${i}]`),
  )
  uniqueIds(systems, 'settings.systems')
  return {
    wallThickness: int(o.wallThickness, 'settings.wallThickness', 1),
    wallHeight: int(o.wallHeight, 'settings.wallHeight', 1),
    door: preset(o.door, 'settings.door'),
    window: preset(o.window, 'settings.window'),
    gridSize: int(o.gridSize, 'settings.gridSize', 1),
    systems,
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
  return {
    id: str(o.id, `${path}.id`),
    wallId: str(o.wallId, `${path}.wallId`),
    type: oneOf(o.type, `${path}.type`, ['door', 'window'] as const),
    offset: int(o.offset, `${path}.offset`, 0),
    width: int(o.width, `${path}.width`, 1),
    height: int(o.height, `${path}.height`, 1),
    sillHeight: int(o.sillHeight, `${path}.sillHeight`, 0),
  }
}

function equipment(value: unknown, path: string): Equipment {
  const o = obj(value, path)
  const tag = str(o.tag, `${path}.tag`)
  if (tag !== tag.trim()) {
    throw new SceneFormatError(`${path}.tag: must not start or end with a space`)
  }
  return {
    id: str(o.id, `${path}.id`),
    tag,
    type: readEquipmentType(o.type, `${path}.type`),
    position: point(o.position, `${path}.position`),
    elevation: int(o.elevation, `${path}.elevation`, 0),
    rotation: int(o.rotation, `${path}.rotation`, 0, 359),
  }
}

function emptyList(value: unknown, path: string): [] {
  // Pipes are defined in phase 3; only an empty list is known now.
  if (arr(value, path).length > 0) {
    throw new SceneFormatError(`${path}: not supported in this version`)
  }
  return []
}

function parse(json: unknown): Scene {
  const root = obj(migrateScene(json), 'scene')
  if (root.version !== SCENE_VERSION) {
    throw new SceneFormatError(`version: unsupported scene version ${String(root.version)}`)
  }
  if (root.units !== 'mm') throw new SceneFormatError('units: expected "mm"')

  const walls = arr(root.walls, 'walls').map((w, i) => wall(w, `walls[${i}]`))
  const openings = arr(root.openings, 'openings').map((o, i) => opening(o, `openings[${i}]`))
  const items = arr(root.equipment, 'equipment').map((e, i) => equipment(e, `equipment[${i}]`))
  uniqueIds([...walls, ...openings, ...items], 'ids')

  openings.forEach((o, i) => {
    const host = walls.find((w) => w.id === o.wallId)
    if (!host) throw new SceneFormatError(`openings[${i}].wallId: unknown wall "${o.wallId}"`)
    const error = validateOpening(o, host, openings)
    if (error) throw new SceneFormatError(`openings[${i}]: ${error}`)
  })

  const tags = new Set<string>()
  items.forEach((item, i) => {
    if (tags.has(item.tag)) {
      throw new SceneFormatError(`equipment[${i}].tag: duplicate tag "${item.tag}"`)
    }
    tags.add(item.tag)
  })

  return {
    version: SCENE_VERSION,
    units: 'mm',
    settings: settings(root.settings),
    walls,
    openings,
    equipment: items,
    pipes: emptyList(root.pipes, 'pipes'),
  }
}

/**
 * Validates stored JSON and returns a typed scene of the current version. Older versions
 * are upgraded first. Invalid or unknown data is rejected with a message naming the
 * offending field instead of crashing the app.
 */
export function parseScene(json: unknown): ParseSceneResult {
  try {
    return { ok: true, scene: parse(json) }
  } catch (err) {
    if (err instanceof SceneFormatError) return { ok: false, error: err.message }
    throw err
  }
}
