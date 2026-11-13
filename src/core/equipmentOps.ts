import { footprintSize, normalizeRotation } from './equipmentGeometry'
import type { Equipment, EquipmentType, Point, Scene } from './scene'
import { fail, ok, type SceneResult } from './sceneResult'
import { withoutPipesAt } from './pipeOps'
import { allTags, isTagFree, nextTag } from './tags'

const isInt = (v: number) => Number.isSafeInteger(v)
const roundPoint = (p: Point): Point => ({ x: Math.round(p.x) + 0, y: Math.round(p.y) + 0 })

/** Independent copy of a type, so a placed item never shares data with the catalogue. */
export function cloneEquipmentType(type: EquipmentType): EquipmentType {
  return JSON.parse(JSON.stringify(type)) as EquipmentType
}

function validated(scene: Scene, item: Equipment): SceneResult | Equipment {
  if (item.tag === '' || item.tag !== item.tag.trim()) return fail('tagEmpty')
  if (!isTagFree(allTags(scene), item.tag, item.id)) return fail('tagTaken')
  if (!isInt(item.position.x) || !isInt(item.position.y)) return fail('invalidPlacement')
  if (!isInt(item.elevation) || item.elevation < 0) return fail('invalidPlacement')
  if (!Number.isInteger(item.rotation) || item.rotation < 0 || item.rotation > 359) {
    return fail('invalidPlacement')
  }
  return item
}

export interface NewEquipment {
  id: string
  /** Catalogue type; it is copied into the scene. */
  type: EquipmentType
  position: Point
  rotation?: number
  elevation?: number
  /** Defaults to the next free tag for the type's prefix. */
  tag?: string
}

/** Places equipment. Without a tag it gets `prefix-NN` (see nextTag). */
export function addEquipment(scene: Scene, input: NewEquipment): SceneResult {
  const tags = allTags(scene).map((t) => t.tag)
  const item = validated(scene, {
    id: input.id,
    tag: input.tag ?? nextTag(input.type.tagPrefix, tags),
    type: cloneEquipmentType(input.type),
    position: roundPoint(input.position),
    elevation: input.elevation ?? 0,
    rotation: normalizeRotation(input.rotation ?? 0),
  })
  if ('ok' in item) return item
  return ok({ ...scene, equipment: [...scene.equipment, item] })
}

export type EquipmentPatch = Partial<Pick<Equipment, 'tag' | 'position' | 'elevation' | 'rotation'>>

/**
 * Changes tag, position, elevation and/or rotation. The tag is stored exactly as given
 * (it must be unique and must not be empty); rotation is normalised to 0-359.
 */
export function updateEquipment(scene: Scene, id: string, patch: EquipmentPatch): SceneResult {
  const current = scene.equipment.find((e) => e.id === id)
  if (!current) return fail('notFound')
  if (patch.rotation !== undefined && !Number.isFinite(patch.rotation)) {
    return fail('invalidPlacement')
  }
  const item = validated(scene, {
    ...current,
    ...patch,
    position: patch.position ? roundPoint(patch.position) : current.position,
    rotation: patch.rotation === undefined ? current.rotation : normalizeRotation(patch.rotation),
  })
  if ('ok' in item) return item
  return ok({ ...scene, equipment: scene.equipment.map((e) => (e.id === id ? item : e)) })
}

export function moveEquipment(scene: Scene, id: string, position: Point): SceneResult {
  return updateEquipment(scene, id, { position })
}

/** Rotates by `delta` degrees (counter-clockwise for positive values). */
export function rotateEquipment(scene: Scene, id: string, delta: number): SceneResult {
  const current = scene.equipment.find((e) => e.id === id)
  if (!current) return fail('notFound')
  return updateEquipment(scene, id, { rotation: current.rotation + delta })
}

/**
 * Removes equipment together with its pipes. Tags of the remaining equipment are never
 * changed.
 */
export function removeEquipment(scene: Scene, id: string): SceneResult {
  if (!scene.equipment.some((e) => e.id === id)) return fail('notFound')
  const next = withoutPipesAt(scene, id)
  return ok({ ...next, equipment: next.equipment.filter((e) => e.id !== id) })
}

/**
 * Copies equipment under a new id and the next free tag. By default the copy is placed
 * beside the original (one footprint plus one grid step along +x).
 */
export function duplicateEquipment(
  scene: Scene,
  id: string,
  newId: string,
  offset?: Point,
): SceneResult {
  const source = scene.equipment.find((e) => e.id === id)
  if (!source) return fail('notFound')
  const { width, depth } = footprintSize(source.type)
  const shift = offset ?? { x: Math.max(width, depth) + scene.settings.gridSize, y: 0 }
  return addEquipment(scene, {
    id: newId,
    type: source.type,
    position: { x: source.position.x + shift.x, y: source.position.y + shift.y },
    rotation: source.rotation,
    elevation: source.elevation,
  })
}

/**
 * Replaces the type copy of placed equipment with a newer version of its type (e.g. after
 * the public catalogue gained ports). Only on the user's request: catalogue edits never
 * change a project by themselves. Pipes at ports that no longer exist are removed; the
 * other pipes stay and are routed again if their connection moved.
 */
export function replaceEquipmentType(scene: Scene, id: string, type: EquipmentType): SceneResult {
  const current = scene.equipment.find((e) => e.id === id)
  if (!current) return fail('notFound')
  const portIds = new Set(type.ports.map((p) => p.id))
  const gone = (end: { kind: string; equipmentId?: string; portId?: string }) =>
    end.kind === 'port' && end.equipmentId === id && !portIds.has(end.portId!)
  return ok({
    ...scene,
    pipes: scene.pipes.filter((p) => !gone(p.from) && !gone(p.to)),
    equipment: scene.equipment.map((e) =>
      e.id === id ? { ...e, type: cloneEquipmentType(type) } : e,
    ),
  })
}
