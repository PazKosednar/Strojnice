import { endLabel, resolveEnd } from '../pipeEnds'
import { setPipeRoute } from '../pipeOps'
import { effectiveDiameter, effectiveRadius } from '../pipeSize'
import { routeSegments, segmentDistance } from '../rules/geometry'
import type { Pipe, PipeEnd, Scene } from '../scene'
import { ROUTING_LIMITS, type RoutingCosts, type RoutingLimits } from './costs'
import { routePipe, type Companion, type RouteOutcome } from './routePipe'

/** Equipment (or terminal) an end belongs to. */
const ownerOf = (end: PipeEnd) => (end.kind === 'port' ? end.equipmentId : end.terminalId)

/** Pipes between the same two items form a circuit (e.g. flow and return). */
const circuitKey = (pipe: Pipe) => [ownerOf(pipe.from), ownerOf(pipe.to)].sort().join('|')

function labelOf(scene: Scene, pipe: Pipe): string {
  const side = (end: PipeEnd) => {
    const resolved = resolveEnd(scene, end)
    return resolved ? endLabel(resolved) : '?'
  }
  return `${side(pipe.from)} → ${side(pipe.to)}`
}

const compare = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)

/**
 * Order of joint routing: circuits with the largest pipe (insulation included) first, pairs
 * before single pipes, then by label; within a circuit by the order of the systems in the
 * project, then by label. The same input always gives the same order.
 */
export function routeOrder(scene: Scene, pipeIds: readonly string[]): string[] {
  const pipes = pipeIds
    .map((id) => scene.pipes.find((p) => p.id === id))
    .filter((p): p is Pipe => p !== undefined)
  const systemIndex = (id: string) => {
    const i = scene.settings.systems.findIndex((s) => s.id === id)
    return i < 0 ? Infinity : i
  }
  const groups = new Map<string, Pipe[]>()
  for (const pipe of pipes) {
    const key = circuitKey(pipe)
    groups.set(key, [...(groups.get(key) ?? []), pipe])
  }
  const sorted = [...groups.values()].map((group) =>
    [...group].sort(
      (a, b) =>
        systemIndex(a.systemId) - systemIndex(b.systemId) ||
        compare(labelOf(scene, a), labelOf(scene, b)) ||
        compare(a.id, b.id),
    ),
  )
  const size = (g: Pipe[]) => Math.max(...g.map((p) => effectiveDiameter(scene, p)))
  sorted.sort(
    (a, b) =>
      size(b) - size(a) ||
      Math.min(b.length, 2) - Math.min(a.length, 2) ||
      compare(labelOf(scene, a[0]!), labelOf(scene, b[0]!)),
  )
  return sorted.flat().map((p) => p.id)
}

export interface BatchResult {
  pipeId: string
  outcome: RouteOutcome
}

export interface RouteAllOptions {
  costs?: Partial<RoutingCosts>
  limits?: Partial<RoutingLimits>
  now?: () => number
  /** Called after each pipe: pipes finished so far and pipes in the batch. */
  onProgress?: (done: number, total: number) => void
}

const ripUpReasons = new Set(['noPath', 'startBlocked', 'goalBlocked'])

function withRoute(scene: Scene, id: string, route: Pipe['route']): Scene {
  const result = setPipeRoute(scene, id, { route })
  return result.ok ? result.scene : scene
}

/**
 * Routes several automatic pipes together. Order: routeOrder. The second pipe of a circuit
 * is rewarded for running alongside the first at the spacing. When a pipe finds no way,
 * the pipes of this batch that close it off are ripped up, the pipe is routed and they are
 * routed again (at most `ripUpRounds` times, within `batchBudgetMs`). Manual pipes and
 * pipes outside the batch are never changed and stay obstacles.
 */
export function routeAll(
  scene: Scene,
  pipeIds: readonly string[],
  options: RouteAllOptions = {},
): { scene: Scene; results: BatchResult[] } {
  const limits: RoutingLimits = { ...ROUTING_LIMITS, ...options.limits }
  const now = options.now ?? (() => Date.now())
  const routeOptions = { costs: options.costs, limits: options.limits, now }
  const order = routeOrder(scene, pipeIds)
  const batch = new Set(order)
  const deadline = now() + limits.batchBudgetMs

  // Pipes of the batch are not obstacles until they are routed again.
  let current = order.reduce((s, id) => withRoute(s, id, []), scene)
  const results = new Map<string, RouteOutcome>()
  const queue = [...order]
  let rounds = 0
  const pipeOf = (s: Scene, id: string) => s.pipes.find((p) => p.id === id)!

  const companionsFor = (s: Scene, pipe: Pipe): Companion[] =>
    s.pipes
      .filter(
        (p) =>
          p.id !== pipe.id &&
          batch.has(p.id) &&
          results.get(p.id)?.ok === true &&
          circuitKey(p) === circuitKey(pipe),
      )
      .map((p) => ({
        route: p.route,
        distance: effectiveRadius(s, p) + effectiveRadius(s, pipe) + s.settings.pipeSpacing,
      }))

  while (queue.length > 0) {
    const id = queue.shift()!
    if (now() > deadline) {
      results.set(id, { ok: false, reason: 'timeout' })
      continue
    }
    const pipe = pipeOf(current, id)
    const outcome = routePipe(current, pipe, {
      ...routeOptions,
      companions: companionsFor(current, pipe),
    })
    if (outcome.ok) {
      current = withRoute(current, id, outcome.route)
      results.set(id, outcome)
    } else if (rounds < limits.ripUpRounds && ripUpReasons.has(outcome.reason)) {
      // Would it go without the other pipes of this batch? Then those in its way move.
      const routed = [...results.entries()].filter(([, o]) => o.ok).map(([pid]) => pid)
      const relaxed = routed.reduce((s, pid) => withRoute(s, pid, []), current)
      const trial = routePipe(relaxed, pipe, routeOptions)
      const blockers = trial.ok
        ? routed.filter((pid) => {
            const other = pipeOf(current, pid)
            const gap =
              effectiveRadius(current, other) +
              effectiveRadius(current, pipe) +
              current.settings.pipeSpacing
            const mine = routeSegments(trial.route)
            return routeSegments(other.route).some((s) =>
              mine.some((t) => segmentDistance(s, t).distance < gap - 1),
            )
          })
        : []
      if (trial.ok && blockers.length > 0) {
        rounds++
        current = blockers.reduce((s, pid) => withRoute(s, pid, []), current)
        current = withRoute(current, id, trial.route)
        results.set(id, trial)
        for (const pid of blockers) {
          results.delete(pid)
          queue.push(pid)
        }
      } else {
        results.set(id, outcome)
      }
    } else {
      results.set(id, outcome)
    }
    options.onProgress?.(results.size, order.length)
  }
  return {
    scene: current,
    results: order.map((pipeId) => ({ pipeId, outcome: results.get(pipeId)! })),
  }
}
