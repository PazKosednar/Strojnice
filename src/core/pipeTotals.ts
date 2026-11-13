import { routeStats, wallCrossings } from './routing/routeGeometry'
import { checkRules } from './rules/checkRules'
import type { Scene } from './scene'

/** Totals of all pipes of a scene, for comparing before / after automatic routing. */
export interface PipeTotals {
  pipes: number
  /** Pipes without a route. */
  unrouted: number
  /** Centre-line length (mm). */
  length: number
  bends: number
  wallCrossings: number
  /** Violations of effective project rules. */
  violations: number
}

export function pipeTotals(scene: Scene): PipeTotals {
  const totals: PipeTotals = {
    pipes: scene.pipes.length,
    unrouted: 0,
    length: 0,
    bends: 0,
    wallCrossings: 0,
    violations: checkRules(scene).length,
  }
  for (const pipe of scene.pipes) {
    if (pipe.route.length < 2) {
      totals.unrouted++
      continue
    }
    const stats = routeStats(pipe.route)
    totals.length += stats.length
    totals.bends += stats.bends
    totals.wallCrossings += wallCrossings(scene, pipe.route).length
  }
  return totals
}
