import { coord, int, obj, oneOf, point, SceneFormatError, str, text } from './parseHelpers'
import type { Obstacle, ObstacleCategory, PlanBox, Zone, ZoneKind } from './scene'

export const OBSTACLE_CATEGORIES: readonly ObstacleCategory[] = [
  'electrical',
  'duct',
  'structure',
  'other',
]
export const ZONE_KINDS: readonly ZoneKind[] = ['forbidden', 'avoid', 'preferred']

function planBox(o: Record<string, unknown>, path: string): PlanBox {
  return {
    center: point(o.center, `${path}.center`),
    width: int(o.width, `${path}.width`, 1),
    depth: int(o.depth, `${path}.depth`, 1),
    rotation: int(o.rotation, `${path}.rotation`, 0, 359),
    bottom: coord(o.bottom, `${path}.bottom`),
    height: int(o.height, `${path}.height`, 1),
  }
}

export function readObstacle(value: unknown, path: string): Obstacle {
  const o = obj(value, path)
  const tag = str(o.tag, `${path}.tag`)
  if (tag !== tag.trim()) {
    throw new SceneFormatError(`${path}.tag: must not start or end with a space`)
  }
  return {
    id: str(o.id, `${path}.id`),
    tag,
    name: text(o.name, `${path}.name`),
    category: oneOf(o.category, `${path}.category`, OBSTACLE_CATEGORIES),
    ...planBox(o, path),
  }
}

export function readZone(value: unknown, path: string): Zone {
  const o = obj(value, path)
  return {
    id: str(o.id, `${path}.id`),
    name: text(o.name, `${path}.name`),
    kind: oneOf(o.kind, `${path}.kind`, ZONE_KINDS),
    ...planBox(o, path),
  }
}
