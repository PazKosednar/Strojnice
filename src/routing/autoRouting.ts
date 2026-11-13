import { pipeEndPoints, routeDisconnected } from '../core/pipeChecks'
import { endLabel, resolveEnd } from '../core/pipeEnds'
import { setPipeRoute } from '../core/pipeOps'
import type { RouteFailure, RouteOutcome } from '../core/routing/routePipe'
import { ROUTING_LIMITS } from '../core/routing/costs'
import type { Pipe, PipeEnd, Scene } from '../core/scene'
import type { SceneResult } from '../core/sceneResult'

function endItem(scene: Scene, end: PipeEnd): unknown {
  return end.kind === 'port'
    ? scene.equipment.find((e) => e.id === end.equipmentId)
    : scene.terminals.find((t) => t.id === end.terminalId)
}

/**
 * Automatic pipes that must be (re-)routed after a change from `previous` to `next`:
 * - new pipes without a route (and without a stored failure),
 * - pipes whose route no longer meets their ends (equipment or terminal moved/rotated),
 * - failed pipes whose end changed (worth trying again),
 * - all of them when what routing depends on changed (obstacles, zones, rules, settings
 *   such as insulation or pipe spacing).
 * Manual pipes are never touched. Scene objects are immutable, so "changed" is identity.
 */
export function pipesNeedingRoute(previous: Scene | null, next: Scene): string[] {
  if (
    previous &&
    (previous.obstacles !== next.obstacles ||
      previous.zones !== next.zones ||
      previous.rules !== next.rules ||
      previous.settings !== next.settings)
  ) {
    return autoPipeIds(next)
  }
  return next.pipes
    .filter((pipe) => {
      if (pipe.mode !== 'auto') return false
      if (pipe.route.length > 0) return routeDisconnected(next, pipe)
      if (!pipe.routeError) return true
      if (!previous) return false
      return [pipe.from, pipe.to].some((end) => endItem(previous, end) !== endItem(next, end))
    })
    .map((pipe) => pipe.id)
}

/** All automatic pipes, in scene order ("Ponovno speljaj vse samodejne"). */
export function autoPipeIds(scene: Scene): string[] {
  return scene.pipes.filter((p) => p.mode === 'auto').map((p) => p.id)
}

/** Slovenian reason stored with a pipe that could not be routed. */
export function routeErrorMessage(scene: Scene, pipe: Pipe, reason: RouteFailure): string {
  const label = (end: PipeEnd) => {
    const resolved = resolveEnd(scene, end)
    return resolved ? endLabel(resolved) : '?'
  }
  switch (reason) {
    case 'startAtFloor':
      return `Priključek ${label(pipe.from)} je obrnjen navzdol tik nad tlemi, zato cev nima prostora. Napravi vnesi višino montaže (Višina od tal).`
    case 'goalAtFloor':
      return `Priključek ${label(pipe.to)} je obrnjen navzdol tik nad tlemi, zato cev nima prostora. Napravi vnesi višino montaže (Višina od tal).`
    case 'startBlocked':
      return `Priključek ${label(pipe.from)} je zaprt.`
    case 'goalBlocked':
      return `Priključek ${label(pipe.to)} je zaprt.`
    case 'noPath':
      return `Med ${label(pipe.from)} in ${label(pipe.to)} ni proste poti.`
    case 'timeout':
      return `Računanje trase je preseglo časovno omejitev (${ROUTING_LIMITS.timeBudgetMs / 1000} s). Povečaj korak mreže za speljevanje ali premakni naprave.`
    case 'tooLarge':
      return `Prostor je prevelik za samodejno speljevanje (tudi z mrežo ${ROUTING_LIMITS.maxGridStep} mm).`
    case 'missingEnd':
      return 'Konec cevi ne obstaja več.'
  }
}

/**
 * Applies a routing result to the current scene. Returns null (nothing to do) when the pipe
 * is gone, was switched to manual in the meantime, or the result is stale: a found route
 * that no longer meets the pipe's current ends.
 */
export function applyRouteOutcome(
  scene: Scene,
  pipeId: string,
  outcome: RouteOutcome,
): SceneResult | null {
  const pipe = scene.pipes.find((p) => p.id === pipeId)
  if (!pipe || pipe.mode !== 'auto') return null
  if (!outcome.ok) {
    return setPipeRoute(scene, pipeId, {
      route: [],
      routeError: routeErrorMessage(scene, pipe, outcome.reason),
    })
  }
  const ends = pipeEndPoints(scene, pipe)
  const first = outcome.route[0]
  const last = outcome.route[outcome.route.length - 1]
  const same = (a?: { x: number; y: number; z: number }, b?: { x: number; y: number; z: number }) =>
    !!a && !!b && a.x === b.x && a.y === b.y && a.z === b.z
  if (!ends || !same(first, ends.from) || !same(last, ends.to)) return null
  return setPipeRoute(scene, pipeId, { route: outcome.route, mode: 'auto' })
}
