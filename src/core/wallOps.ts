import { validateOpening } from './openingValidation'
import type { Point, Scene, Wall } from './scene'
import { fail, isPositiveInt, ok, type SceneResult } from './sceneResult'
import { pointAtDistance, wallAngle } from './wallGeometry'

const samePoint = (a: Point, b: Point) => a.x === b.x && a.y === b.y
const isZeroLength = (w: Wall) => samePoint(w.start, w.end)
const roundPoint = (p: Point): Point => ({ x: Math.round(p.x) + 0, y: Math.round(p.y) + 0 })

/** True when every opening still fits its (possibly changed) wall. */
function openingsFit(scene: Scene, wallIds: ReadonlySet<string>): boolean {
  return scene.openings.every((o) => {
    if (!wallIds.has(o.wallId)) return true
    const wall = scene.walls.find((w) => w.id === o.wallId)
    return wall !== undefined && validateOpening(o, wall, scene.openings) === null
  })
}

export interface NewWall {
  start: Point
  end: Point
  /** Defaults to the project setting. */
  thickness?: number
  /** Defaults to the project setting. */
  height?: number
}

/** Adds walls (one operation, e.g. a whole room). Points are rounded to whole mm. */
export function addWalls(scene: Scene, walls: readonly (NewWall & { id: string })[]): SceneResult {
  const created: Wall[] = []
  for (const w of walls) {
    const wall: Wall = {
      id: w.id,
      start: roundPoint(w.start),
      end: roundPoint(w.end),
      thickness: w.thickness ?? scene.settings.wallThickness,
      height: w.height ?? scene.settings.wallHeight,
    }
    if (isZeroLength(wall)) return fail('wallTooShort')
    if (!isPositiveInt(wall.thickness) || !isPositiveInt(wall.height)) return fail('invalidValue')
    created.push(wall)
  }
  return ok({ ...scene, walls: [...scene.walls, ...created] })
}

/** Adds one wall. */
export function addWall(scene: Scene, wall: NewWall, id: string): SceneResult {
  return addWalls(scene, [{ ...wall, id }])
}

/**
 * Moves one endpoint of a wall. Endpoints of other walls at the same coordinate move
 * too, so joined corners stay joined. Opening offsets are kept (measured from the start).
 */
export function moveWallEndpoint(
  scene: Scene,
  wallId: string,
  which: 'start' | 'end',
  to: Point,
): SceneResult {
  const wall = scene.walls.find((w) => w.id === wallId)
  if (!wall) return fail('notFound')
  const from = wall[which]
  const target = roundPoint(to)
  if (samePoint(from, target)) return ok(scene)

  const changed = new Set<string>()
  const walls = scene.walls.map((w) => {
    const start = samePoint(w.start, from)
    const end = samePoint(w.end, from)
    if (!start && !end) return w
    changed.add(w.id)
    return { ...w, start: start ? target : w.start, end: end ? target : w.end }
  })
  const next = { ...scene, walls }
  if (walls.some((w) => changed.has(w.id) && isZeroLength(w))) return fail('wallTooShort')
  if (!openingsFit(next, changed)) return fail('openingsDoNotFit')
  return ok(next)
}

/** Sets the axis length by moving the wall end along its direction (joined walls follow). */
export function setWallLength(scene: Scene, wallId: string, length: number): SceneResult {
  const wall = scene.walls.find((w) => w.id === wallId)
  if (!wall) return fail('notFound')
  if (!isPositiveInt(length)) return fail('invalidValue')
  return moveWallEndpoint(
    scene,
    wallId,
    'end',
    pointAtDistance(wall.start, wallAngle(wall), length),
  )
}

/** Changes thickness and/or height. */
export function updateWall(
  scene: Scene,
  wallId: string,
  patch: Partial<Pick<Wall, 'thickness' | 'height'>>,
): SceneResult {
  const wall = scene.walls.find((w) => w.id === wallId)
  if (!wall) return fail('notFound')
  const updated = { ...wall, ...patch }
  if (!isPositiveInt(updated.thickness) || !isPositiveInt(updated.height)) {
    return fail('invalidValue')
  }
  const next = { ...scene, walls: scene.walls.map((w) => (w.id === wallId ? updated : w)) }
  if (!openingsFit(next, new Set([wallId]))) return fail('openingsDoNotFit')
  return ok(next)
}

/** Removes a wall together with all of its openings. */
export function removeWall(scene: Scene, wallId: string): SceneResult {
  if (!scene.walls.some((w) => w.id === wallId)) return fail('notFound')
  return ok({
    ...scene,
    walls: scene.walls.filter((w) => w.id !== wallId),
    openings: scene.openings.filter((o) => o.wallId !== wallId),
  })
}
