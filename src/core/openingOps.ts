import { validateOpening } from './openingValidation'
import type { Opening, OpeningType, Scene } from './scene'
import { fail, ok, type SceneResult } from './sceneResult'
import { wallLength } from './wallGeometry'

/** Adds an opening after checking that it fits its wall. */
export function addOpening(scene: Scene, opening: Opening): SceneResult {
  const wall = scene.walls.find((w) => w.id === opening.wallId)
  if (!wall) return fail('notFound')
  const error = validateOpening(opening, wall, scene.openings)
  if (error) return fail(error)
  return ok({ ...scene, openings: [...scene.openings, opening] })
}

export type OpeningPatch = Partial<Pick<Opening, 'offset' | 'width' | 'height' | 'sillHeight'>>

/** Changes offset/size of an opening. Doors keep a zero sill. */
export function updateOpening(scene: Scene, openingId: string, patch: OpeningPatch): SceneResult {
  const opening = scene.openings.find((o) => o.id === openingId)
  if (!opening) return fail('notFound')
  const wall = scene.walls.find((w) => w.id === opening.wallId)
  if (!wall) return fail('notFound')
  const updated: Opening = { ...opening, ...patch }
  const error = validateOpening(updated, wall, scene.openings)
  if (error) return fail(error)
  return ok({ ...scene, openings: scene.openings.map((o) => (o.id === openingId ? updated : o)) })
}

export function removeOpening(scene: Scene, openingId: string): SceneResult {
  if (!scene.openings.some((o) => o.id === openingId)) return fail('notFound')
  return ok({ ...scene, openings: scene.openings.filter((o) => o.id !== openingId) })
}

/**
 * Creates an opening of the project's preset size, centred on `along` (mm from the wall
 * start) and clamped to the wall. Rejected when it does not fit or overlaps another opening.
 */
export function placeOpening(
  scene: Scene,
  wallId: string,
  type: OpeningType,
  along: number,
  id: string,
): SceneResult {
  const wall = scene.walls.find((w) => w.id === wallId)
  if (!wall) return fail('notFound')
  const preset = scene.settings[type]
  const maxOffset = Math.floor(wallLength(wall)) - preset.width
  if (maxOffset < 0) return fail('outsideWall')
  const offset = Math.min(Math.max(Math.round(along - preset.width / 2), 0), maxOffset)
  return addOpening(scene, {
    id,
    wallId,
    type,
    offset,
    width: preset.width,
    height: preset.height,
    sillHeight: type === 'door' ? 0 : preset.sillHeight,
  })
}
