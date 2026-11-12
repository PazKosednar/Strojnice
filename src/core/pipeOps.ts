import { endDiameter, endSystemId, pipeEndKey, resolveEnd, sameEnd } from './pipeEnds'
import type { Pipe, PipeEnd, RoutePoint, Scene } from './scene'
import { fail, ok, type SceneError, type SceneResult } from './sceneResult'

export type ConnectionCheck =
  | { ok: true; systemId: string; outerDiameter: number; diameterMismatch: boolean }
  | { ok: false; error: SceneError }

/** True when some pipe (other than `exceptPipeId`) already uses this end. */
export function endInUse(scene: Scene, end: PipeEnd, exceptPipeId?: string): boolean {
  const key = pipeEndKey(end)
  return scene.pipes.some(
    (p) => p.id !== exceptPipeId && (pipeEndKey(p.from) === key || pipeEndKey(p.to) === key),
  )
}

/**
 * Checks whether two ends may be connected: both exist, are different, belong to the same
 * system, are free (one pipe per end) and have an outer diameter. Different diameters are
 * allowed (reported as a warning); the pipe takes the diameter of `from`.
 */
export function checkConnection(scene: Scene, from: PipeEnd, to: PipeEnd): ConnectionCheck {
  const a = resolveEnd(scene, from)
  const b = resolveEnd(scene, to)
  if (!a || !b) return { ok: false, error: 'notFound' }
  if (sameEnd(from, to)) return { ok: false, error: 'pipeSameEnd' }
  if (endSystemId(a) !== endSystemId(b)) return { ok: false, error: 'pipeSystemMismatch' }
  if (endInUse(scene, from) || endInUse(scene, to)) return { ok: false, error: 'pipeEndInUse' }
  const da = endDiameter(a)
  const db = endDiameter(b)
  if (da === undefined || db === undefined) return { ok: false, error: 'pipeEndNoDiameter' }
  return { ok: true, systemId: endSystemId(a), outerDiameter: da, diameterMismatch: da !== db }
}

/** Adds a pipe without a route ('auto'); the caller routes it afterwards. */
export function addPipe(
  scene: Scene,
  input: { id: string; from: PipeEnd; to: PipeEnd },
): SceneResult {
  const check = checkConnection(scene, input.from, input.to)
  if (!check.ok) return fail(check.error)
  const pipe: Pipe = {
    id: input.id,
    systemId: check.systemId,
    from: input.from,
    to: input.to,
    outerDiameter: check.outerDiameter,
    route: [],
    mode: 'auto',
  }
  return ok({ ...scene, pipes: [...scene.pipes, pipe] })
}

function isOrthogonal(route: readonly RoutePoint[]): boolean {
  return route.every((p, i) => {
    const prev = route[i - 1]
    if (!prev) return Number.isInteger(p.x) && Number.isInteger(p.y) && Number.isInteger(p.z)
    const changed = Number(p.x !== prev.x) + Number(p.y !== prev.y) + Number(p.z !== prev.z)
    return changed === 1 && Number.isInteger(p.x) && Number.isInteger(p.y) && Number.isInteger(p.z)
  })
}

export interface RouteUpdate {
  route: RoutePoint[]
  /** Set by manual edits; automatic routing keeps 'auto'. */
  mode?: Pipe['mode']
  /** Reason when automatic routing found no route (route is then empty). */
  routeError?: string
}

/** Stores a new route. Routes must consist of integer, axis-parallel segments. */
export function setPipeRoute(scene: Scene, id: string, update: RouteUpdate): SceneResult {
  const current = scene.pipes.find((p) => p.id === id)
  if (!current) return fail('notFound')
  if (!isOrthogonal(update.route)) return fail('invalidRoute')
  const next: Pipe = { ...current, route: update.route, mode: update.mode ?? current.mode }
  if (update.routeError) next.routeError = update.routeError
  else delete next.routeError
  return ok({ ...scene, pipes: scene.pipes.map((p) => (p.id === id ? next : p)) })
}

export function setPipeMode(scene: Scene, id: string, mode: Pipe['mode']): SceneResult {
  const current = scene.pipes.find((p) => p.id === id)
  if (!current) return fail('notFound')
  return ok({ ...scene, pipes: scene.pipes.map((p) => (p.id === id ? { ...p, mode } : p)) })
}

export function removePipe(scene: Scene, id: string): SceneResult {
  if (!scene.pipes.some((p) => p.id === id)) return fail('notFound')
  return ok({ ...scene, pipes: scene.pipes.filter((p) => p.id !== id) })
}

/** Removes all pipes attached to an equipment item or a terminal (used by cascading deletes). */
export function withoutPipesAt(scene: Scene, ownerId: string): Scene {
  const touches = (end: PipeEnd) =>
    end.kind === 'port' ? end.equipmentId === ownerId : end.terminalId === ownerId
  return { ...scene, pipes: scene.pipes.filter((p) => !touches(p.from) && !touches(p.to)) }
}

/**
 * Sets the outer diameter of a port of PLACED equipment (its copy of the type). Existing
 * pipes keep their diameter; a mismatch shows up as a warning.
 */
export function setPortDiameter(
  scene: Scene,
  equipmentId: string,
  portId: string,
  outerDiameter: number,
): SceneResult {
  const item = scene.equipment.find((e) => e.id === equipmentId)
  if (!item || !item.type.ports.some((p) => p.id === portId)) return fail('notFound')
  if (!Number.isInteger(outerDiameter) || outerDiameter <= 0) return fail('invalidValue')
  const ports = item.type.ports.map((p) => (p.id === portId ? { ...p, outerDiameter } : p))
  const updated = { ...item, type: { ...item.type, ports } }
  return ok({
    ...scene,
    equipment: scene.equipment.map((e) => (e.id === equipmentId ? updated : e)),
  })
}
