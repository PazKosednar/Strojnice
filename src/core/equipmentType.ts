import { arr, coord, int, obj, oneOf, SceneFormatError, str, text, uniqueIds } from './parseHelpers'
import type { Clearances, EquipmentShape, EquipmentType, Port, PortDirection } from './scene'

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
  return {
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
  return type
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
