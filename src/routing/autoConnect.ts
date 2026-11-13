import { addChosenPipes, type ChosenPair } from '../core/connect/proposeConnections'
import { addPipe, setPipeRoute } from '../core/pipeOps'
import type { BatchResult } from '../core/routing/routeAll'
import type { IdFactory, RoutePoint, Scene } from '../core/scene'
import { fail, ok, type SceneResult } from '../core/sceneResult'
import { routeErrorMessage } from './autoRouting'

/** The scene with the confirmed pairs added as automatic pipes (routes still empty). */
export function withProposedPipes(
  base: Scene,
  pairs: readonly ChosenPair[],
  newId: IdFactory,
): { scene: Scene; ids: string[] } | { error: SceneResult & { ok: false } } {
  const result = addChosenPipes(base, pairs, newId)
  if (!result.ok) return { error: result }
  return { scene: result.scene, ids: result.ids ?? [] }
}

/** Routes from the worker put into the scene; failed pipes get the reason in Slovenian. */
export function applyJointResult(
  scene: Scene,
  results: readonly BatchResult[],
  routes: readonly { pipeId: string; route: RoutePoint[] }[],
): Scene {
  let next = scene
  for (const { pipeId, outcome } of results) {
    const pipe = next.pipes.find((p) => p.id === pipeId)
    if (!pipe) continue
    const route = routes.find((r) => r.pipeId === pipeId)?.route ?? []
    const update = outcome.ok
      ? { route }
      : { route: [], routeError: routeErrorMessage(next, pipe, outcome.reason) }
    const result = setPipeRoute(next, pipeId, update)
    if (result.ok) next = result.scene
  }
  return next
}

/**
 * Edit that accepts the chosen pipes of a preview: they are added to the current scene with
 * their computed routes (or their failure reason), as one undo step.
 */
export function acceptPreview(preview: Scene, pipeIds: readonly string[]) {
  return (scene: Scene): SceneResult => {
    let next = scene
    for (const id of pipeIds) {
      const pipe = preview.pipes.find((p) => p.id === id)
      if (!pipe) return fail('notFound')
      const added = addPipe(next, { id, from: pipe.from, to: pipe.to })
      if (!added.ok) return added
      const routed = setPipeRoute(added.scene, id, {
        route: pipe.route,
        ...(pipe.routeError ? { routeError: pipe.routeError } : {}),
      })
      if (!routed.ok) return routed
      next = routed.scene
    }
    return ok(next)
  }
}
