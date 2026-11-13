import { arr, coord, int, obj, oneOf, SceneFormatError, str, text, uniqueIds } from './parseHelpers'
import type {
  Clearances,
  EquipmentModel,
  EquipmentShape,
  EquipmentType,
  Port,
  PortDirection,
} from './scene'

export const PORT_DIRECTIONS: readonly PortDirection[] = ['+x', '-x', '+y', '-y', '+z', '-z']

/** Longest accepted tag prefix. */
export const MAX_TAG_PREFIX_LENGTH = 12

function shape(value: unknown, path: string): EquipmentShape {
  const o = obj(value, path)
  const kind = oneOf(o.kind, `${path}.kind`, ['box', 'cylinder'] as const)
  if (kind === 'box') {
    return {
      kind,
      width: int(o.width, `${path}.width`, 1),
      depth: int(o.depth, `${path}.depth`, 1),
      height: int(o.height, `${path}.height`, 1),
    }
  }
  return {
    kind,
    diameter: int(o.diameter, `${path}.diameter`, 1),
    height: int(o.height, `${path}.height`, 1),
  }
}

function port(value: unknown, path: string): Port {
  const o = obj(value, path)
  const position = obj(o.position, `${path}.position`)
  const result: Port = {
    id: str(o.id, `${path}.id`),
    name: str(o.name, `${path}.name`),
    systemId: str(o.systemId, `${path}.systemId`),
    position: {
      x: coord(position.x, `${path}.position.x`),
      y: coord(position.y, `${path}.position.y`),
      z: coord(position.z, `${path}.position.z`),
    },
    direction: oneOf(o.direction, `${path}.direction`, PORT_DIRECTIONS),
    size: text(o.size, `${path}.size`),
  }
  if (o.outerDiameter !== undefined && o.outerDiameter !== null) {
    result.outerDiameter = int(o.outerDiameter, `${path}.outerDiameter`, 1)
  }
  if (o.connectionKey !== undefined && o.connectionKey !== null) {
    result.connectionKey = str(o.connectionKey, `${path}.connectionKey`)
  }
  if (o.flow !== undefined && o.flow !== null) {
    result.flow = oneOf(o.flow, `${path}.flow`, ['out', 'in'] as const)
  }
  if ((result.connectionKey === undefined) !== (result.flow === undefined)) {
    throw new SceneFormatError(`${path}: connectionKey and flow go together`)
  }
  return result
}

function clearances(value: unknown, path: string): Clearances {
  const o = obj(value, path)
  return {
    front: int(o.front, `${path}.front`, 0),
    back: int(o.back, `${path}.back`, 0),
    left: int(o.left, `${path}.left`, 0),
    right: int(o.right, `${path}.right`, 0),
    top: int(o.top, `${path}.top`, 0),
  }
}

/** Reads and validates an equipment type; throws SceneFormatError naming the bad field. */
export function readEquipmentType(value: unknown, path: string): EquipmentType {
  const o = obj(value, path)
  const tagPrefix = str(o.tagPrefix, `${path}.tagPrefix`)
  if (/\s/.test(tagPrefix) || tagPrefix.length > MAX_TAG_PREFIX_LENGTH) {
    throw new SceneFormatError(
      `${path}.tagPrefix: expected at most ${MAX_TAG_PREFIX_LENGTH} characters without spaces`,
    )
  }
  const ports = arr(o.ports, `${path}.ports`).map((p, i) => port(p, `${path}.ports[${i}]`))
  uniqueIds(ports, `${path}.ports`)
  const type: EquipmentType = {
    id: str(o.id, `${path}.id`),
    name: str(o.name, `${path}.name`),
    tagPrefix,
    shape: shape(o.shape, `${path}.shape`),
    mounting: oneOf(o.mounting, `${path}.mounting`, ['floor', 'wall'] as const),
    ports,
  }
  if (o.clearances !== undefined && o.clearances !== null) {
    type.clearances = clearances(o.clearances, `${path}.clearances`)
  }
  if (o.model !== undefined && o.model !== null) {
    type.model = model(o.model, `${path}.model`)
  }
  return type
}

/** Uploaded model in private storage: `<uuid>/<uuid>/<name>.glb` (no further folders). */
const STORAGE_MODEL_PATH = /^[0-9a-f-]{36}\/[0-9a-f-]{36}\/[^/\\]+\.glb$/i
/** Model of the public catalogue, shipped with the app: `library/<folder>/<name>.glb`. */
const PUBLIC_MODEL_PATH = /^library\/[a-z0-9-]+\/[A-Za-z0-9._-]+\.glb$/

/** True for a model shipped with the app (public catalogue), false for an uploaded one. */
export function isPublicModelPath(path: string): boolean {
  return PUBLIC_MODEL_PATH.test(path)
}

function point3(value: unknown, path: string) {
  const o = obj(value, path)
  return { x: coord(o.x, `${path}.x`), y: coord(o.y, `${path}.y`), z: coord(o.z, `${path}.z`) }
}

function model(value: unknown, path: string): EquipmentModel {
  const o = obj(value, path)
  const modelPath = str(o.path, `${path}.path`)
  if (!STORAGE_MODEL_PATH.test(modelPath) && !isPublicModelPath(modelPath)) {
    throw new SceneFormatError(
      `${path}.path: expected "<user id>/<type id>/<name>.glb" or "library/<folder>/<name>.glb"`,
    )
  }
  const rotation = o.rotation
  if (rotation !== 0 && rotation !== 90 && rotation !== 180 && rotation !== 270) {
    throw new SceneFormatError(`${path}.rotation: expected 0, 90, 180 or 270`)
  }
  const bounds = obj(o.bounds, `${path}.bounds`)
  const min = point3(bounds.min, `${path}.bounds.min`)
  const max = point3(bounds.max, `${path}.bounds.max`)
  if (max.x <= min.x || max.y <= min.y || max.z <= min.z) {
    throw new SceneFormatError(`${path}.bounds: max must be greater than min`)
  }
  return {
    path: modelPath,
    fileName: str(o.fileName, `${path}.fileName`),
    rotation,
    bounds: { min, max },
  }
}

export type ParseEquipmentTypeResult =
  { ok: true; type: EquipmentType } | { ok: false; error: string }

/** Validates a stored catalogue definition without throwing. */
export function parseEquipmentType(json: unknown): ParseEquipmentTypeResult {
  try {
    return { ok: true, type: readEquipmentType(json, 'type') }
  } catch (err) {
    if (err instanceof SceneFormatError) return { ok: false, error: err.message }
    throw err
  }
}
