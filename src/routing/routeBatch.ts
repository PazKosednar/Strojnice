import { routePipe, type RouteOptions, type RouteOutcome } from '../core/routing/routePipe'
import type { Scene } from '../core/scene'

/**
 * Routes pipes one after another. Each routed pipe becomes an obstacle for the next ones
 * (the working copy of the scene gets its route). Pipes not in `pipeIds` keep their routes.
 */
export function routeBatch(
  scene: Scene,
  pipeIds: readonly string[],
  onResult: (pipeId: string, outcome: RouteOutcome) => void,
  options?: RouteOptions,
): void {
  // Pipes about to be re-routed must not block each other with their old routes.
  const pending = new Set(pipeIds)
  let working: Scene = {
    ...scene,
    pipes: scene.pipes.map((p) => (pending.has(p.id) ? { ...p, route: [] } : p)),
  }
  for (const id of pipeIds) {
    const pipe = working.pipes.find((p) => p.id === id)
    if (!pipe) continue
    const outcome = routePipe(working, pipe, options)
    onResult(id, outcome)
    if (outcome.ok) {
      working = {
        ...working,
        pipes: working.pipes.map((p) => (p.id === id ? { ...p, route: outcome.route } : p)),
      }
    }
  }
}
