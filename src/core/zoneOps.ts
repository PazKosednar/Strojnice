import { isValidPlanBox, normalizedPlanBox } from './planBox'
import type { Scene, Zone } from './scene'
import { fail, ok, type SceneResult } from './sceneResult'

export function addZone(scene: Scene, zone: Zone): SceneResult {
  const normalized = normalizedPlanBox(zone)
  if (!isValidPlanBox(normalized)) return fail('invalidBox')
  return ok({ ...scene, zones: [...scene.zones, normalized] })
}

export type ZonePatch = Partial<Omit<Zone, 'id'>>

export function updateZone(scene: Scene, id: string, patch: ZonePatch): SceneResult {
  const current = scene.zones.find((z) => z.id === id)
  if (!current) return fail('notFound')
  const zone = normalizedPlanBox({ ...current, ...patch })
  if (!isValidPlanBox(zone)) return fail('invalidBox')
  return ok({ ...scene, zones: scene.zones.map((z) => (z.id === id ? zone : z)) })
}

export function removeZone(scene: Scene, id: string): SceneResult {
  if (!scene.zones.some((z) => z.id === id)) return fail('notFound')
  return ok({ ...scene, zones: scene.zones.filter((z) => z.id !== id) })
}
