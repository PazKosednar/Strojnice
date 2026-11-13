import { footprintSize } from '../equipmentGeometry'
import { endGeometry, resolveEnd } from '../pipeEnds'
import { effectiveRadius } from '../pipeSize'
import type { Pipe, Point3, RoutePoint, Scene } from '../scene'
import { wallExtensions, wallOutline } from '../wallJoins'
import { ROUTING_COSTS, ROUTING_LIMITS, type RoutingCosts, type RoutingLimits } from './costs'
import { buildGrid, coordIndex, nodeCoords, nodeIndex, type Bounds3, type Grid } from './grid'
import { MinHeap } from './heap'
import { buildObstacleField, type ObstacleField } from './obstacles'
import { routeStats, simplifyRoute, wallCrossings, type WallCrossing } from './routeGeometry'
import { DIRS, opposite, stubOf, type Stub } from './stubs'

export type RouteFailure =
  /** An end of the pipe no longer exists. */
  | 'missingEnd'
  /** The straight run out of the start / end is blocked. */
  | 'startBlocked'
  | 'goalBlocked'
  /** The search finished without reaching the goal. */
  | 'noPath'
  /** The time or expansion budget ran out. */
  | 'timeout'
  /** The scene is too large even for the coarsest grid. */
  | 'tooLarge'

export type RouteOutcome =
  | {
      ok: true
      route: RoutePoint[]
      length: number
      bends: number
      crossings: WallCrossing[]
      /** Grid step actually used (larger than requested for big scenes). */
      gridStep: number
    }
  | { ok: false; reason: RouteFailure; gridStep?: number }

/** Route of the circuit partner to run alongside, and the axis distance to keep. */
export interface Companion {
  route: readonly Point3[]
  distance: number
}

export interface RouteOptions {
  /** Routes to run alongside (rewarded with `parallelFactor`). */
  companions?: readonly Companion[]
  costs?: Partial<RoutingCosts>
  limits?: Partial<RoutingLimits>
  /** Clock in ms; injectable for tests. */
  now?: () => number
}

function sceneBounds(scene: Scene, stubs: readonly Stub[], margin: number): Bounds3 {
  const xs: number[] = []
  const ys: number[] = []
  const zs: number[] = [0]
  const extensions = wallExtensions(scene.walls)
  for (const wall of scene.walls) {
    for (const p of wallOutline(wall, extensions.get(wall.id))) {
      xs.push(p.x)
      ys.push(p.y)
    }
    zs.push(wall.height)
  }
  for (const e of scene.equipment) {
    const { width, depth } = footprintSize(e.type)
    const r = Math.hypot(width, depth) / 2
    xs.push(e.position.x - r, e.position.x + r)
    ys.push(e.position.y - r, e.position.y + r)
    zs.push(e.elevation + e.type.shape.height)
  }
  for (const s of stubs) {
    xs.push(s.point.x, s.end.x)
    ys.push(s.point.y, s.end.y)
    zs.push(s.point.z, s.end.z)
  }
  return {
    minX: Math.min(...xs) - margin,
    maxX: Math.max(...xs) + margin,
    minY: Math.min(...ys) - margin,
    maxY: Math.max(...ys) + margin,
    minZ: 0,
    maxZ: Math.max(...zs),
  }
}

interface SearchInput {
  grid: Grid
  field: ObstacleField
  start: Point3
  startDir: number
  goal: Point3
  /** Direction in which the route should arrive at the goal (towards the connection). */
  goalArriveDir: number
  /** True when the edge runs alongside a companion route at its distance. */
  alongside: (a: Point3, b: Point3) => boolean
  hasCompanions: boolean
  costs: RoutingCosts
  limits: RoutingLimits
  now: () => number
}

type SearchResult = { ok: true; path: Point3[] } | { ok: false; reason: 'noPath' | 'timeout' }

/**
 * Edge test for running alongside companion routes: same direction, within the companion
 * segment's extent, axes between `distance` and `distance + step` apart (the nearest grid
 * line at or beyond the required distance), side by side or one above the other.
 */
function alongsideTest(
  companions: readonly Companion[],
  step: number,
): (a: Point3, b: Point3) => boolean {
  const runs = companions.flatMap((c) =>
    c.route.slice(1).map((q, i) => ({ a: c.route[i]!, b: q, distance: c.distance })),
  )
  return (a, b) => {
    const axis = a.x !== b.x ? 'x' : a.y !== b.y ? 'y' : 'z'
    const mid = (a[axis] + b[axis]) / 2
    for (const run of runs) {
      const runAxis = run.a.x !== run.b.x ? 'x' : run.a.y !== run.b.y ? 'y' : 'z'
      if (runAxis !== axis) continue
      if (mid <= Math.min(run.a[axis], run.b[axis]) || mid >= Math.max(run.a[axis], run.b[axis])) {
        continue
      }
      const [p, q] = (['x', 'y', 'z'] as const).filter((k) => k !== axis)
      const apart = Math.hypot(a[p!] - run.a[p!], a[q!] - run.a[q!])
      if (apart >= run.distance && apart < run.distance + step) return true
    }
    return false
  }
}

/** A* over (grid node × arrival direction), so bends can be priced. */
function search(input: SearchInput): SearchResult {
  const { grid, field, costs, limits } = input
  const { xs, ys, zs } = grid
  const nx = xs.length
  const ny = ys.length
  const nodes = nx * ny * zs.length
  const startNode = nodeIndex(
    grid,
    coordIndex(xs, input.start.x),
    coordIndex(ys, input.start.y),
    coordIndex(zs, input.start.z),
  )
  const goalNode = nodeIndex(
    grid,
    coordIndex(xs, input.goal.x),
    coordIndex(ys, input.goal.y),
    coordIndex(zs, input.goal.z),
  )

  // Lazily evaluated node flags: bit 1 = known, 2 = blocked, 4 = in a wall.
  const flags = new Uint8Array(nodes)
  const nodeFlags = (node: number, p: Point3) => {
    let f = flags[node]!
    if (f === 0) {
      f = 1
      const outOfRange = p.z < field.zMin || p.z > field.zMax
      if (outOfRange || field.blocked(p)) f |= 2
      if (field.inWall(p)) f |= 4
      flags[node] = f
    }
    return f
  }
  const distance = new Float32Array(nx * ny).fill(-1)
  const wallDistance = (ix: number, iy: number) => {
    const k = iy * nx + ix
    let d = distance[k]!
    if (d < 0) {
      d = field.wallDistance(xs[ix]!, ys[iy]!)
      distance[k] = d
    }
    return d
  }

  const states = nodes * 6
  const g = new Float32Array(states).fill(Infinity)
  const parent = new Int32Array(states).fill(-1)
  const closed = new Uint8Array(states)
  const heap = new MinHeap()
  const [gx, gy, gz] = [input.goal.x, input.goal.y, input.goal.z]
  // Lower bound of the cost per mm: preferred zones make pipe cheaper than its length.
  const hScale = Math.min(
    1,
    field.hasPreferredZones ? costs.preferredZoneFactor : 1,
    input.hasCompanions ? costs.parallelFactor : 1,
  )
  const h = (x: number, y: number, z: number) =>
    hScale * (Math.abs(x - gx) + Math.abs(y - gy) + Math.abs(z - gz))
  const [sx, sy, sz] = [input.start.x, input.start.y, input.start.z]
  const isEnd = (x: number, y: number, z: number) =>
    (x === sx && y === sy && z === sz) || (x === gx && y === gy && z === gz)

  const startState = startNode * 6 + input.startDir
  g[startState] = 0
  heap.push(h(input.start.x, input.start.y, input.start.z), startState)
  const deadline = input.now() + limits.timeBudgetMs
  let expansions = 0
  let goalState = -1

  while (heap.size > 0) {
    const state = heap.pop()!
    if (closed[state]) continue
    closed[state] = 1
    const node = (state / 6) | 0
    const dir = state - node * 6
    if (node === goalNode) {
      goalState = state
      break
    }
    if (++expansions > limits.maxExpansions) return { ok: false, reason: 'timeout' }
    if (expansions % limits.clockEvery === 0 && input.now() > deadline) {
      return { ok: false, reason: 'timeout' }
    }
    const [ix, iy, iz] = nodeCoords(grid, node)
    const ux = xs[ix]!
    const uy = ys[iy]!
    const uz = zs[iz]!
    const uFlags = nodeFlags(node, { x: ux, y: uy, z: uz })
    const gu = g[state]!

    for (let d = 0; d < 6; d++) {
      if (d === opposite(dir)) continue
      const step = DIRS[d]!
      const jx = ix + step.x
      const jy = iy + step.y
      const jz = iz + step.z
      if (jx < 0 || jy < 0 || jz < 0 || jx >= nx || jy >= ny || jz >= zs.length) continue
      const vx = xs[jx]!
      const vy = ys[jy]!
      const vz = zs[jz]!
      const next = nodeIndex(grid, jx, jy, jz)
      const isGoal = next === goalNode
      const vFlags = nodeFlags(next, { x: vx, y: vy, z: vz })
      if (!isGoal && vFlags & 2) continue
      const mid = { x: (ux + vx) / 2, y: (uy + vy) / 2, z: (uz + vz) / 2 }
      if (field.blocked(mid)) continue
      const vInWall = (vFlags & 4) !== 0
      const uInWall = (uFlags & 4) !== 0
      const entersWall = !uInWall && (vInWall || field.inWall(mid))
      if (field.wallCrossing === 'blocked' && (vInWall || entersWall)) continue
      // Height ranges and vertical order; the first and last edge are fixed by the ends.
      const ruled =
        isEnd(ux, uy, uz) || isEnd(vx, vy, vz)
          ? 0
          : field.edgeRules({ x: ux, y: uy, z: uz }, { x: vx, y: vy, z: vz })
      if (ruled < 0) continue

      const length = Math.abs(vx - ux) + Math.abs(vy - uy) + Math.abs(vz - uz)
      const near = Math.min(wallDistance(jx, jy), costs.wallDistanceCap) / costs.wallDistanceCap
      let cost = length * (1 + costs.wallDistanceWeight * near)
      if (
        input.hasCompanions &&
        input.alongside({ x: ux, y: uy, z: uz }, { x: vx, y: vy, z: vz })
      ) {
        cost *= costs.parallelFactor
      }
      const zone = field.zoneAt(mid)
      if (zone === 'avoid') cost *= costs.avoidZoneFactor
      else if (zone === 'preferred') cost *= costs.preferredZoneFactor
      if (vInWall && uInWall) cost += length * costs.inWallFactor
      else if (entersWall) {
        cost += costs.wallCrossing
        if (field.wallCrossing === 'penalized') cost += costs.softCrossingPenalty
      }
      if (field.inClearance(mid)) cost += length * costs.clearanceFactor
      const soft = ruled + field.softViolations(mid)
      if (soft > 0) cost += length * costs.softRuleFactor * soft
      if (d !== dir) cost += costs.bend
      if (isGoal && d !== input.goalArriveDir) cost += costs.bend

      const nextState = next * 6 + d
      const total = gu + cost
      if (total < g[nextState]!) {
        g[nextState] = total
        parent[nextState] = state
        heap.push(total + h(vx, vy, vz), nextState)
      }
    }
  }
  if (goalState < 0) return { ok: false, reason: 'noPath' }

  const path: Point3[] = []
  for (let s = goalState; s >= 0; s = parent[s]!) {
    const [ix, iy, iz] = nodeCoords(grid, (s / 6) | 0)
    path.push({ x: xs[ix]!, y: ys[iy]!, z: zs[iz]! })
  }
  return { ok: true, path: path.reverse() }
}

/**
 * Routes one pipe of the scene. Other pipes with a route are obstacles; the pipe itself is
 * not. The route leaves each end straight along the end's direction (portStraight), then
 * follows the cheapest axis-parallel path on the routing grid.
 */
export function routePipe(scene: Scene, pipe: Pipe, options: RouteOptions = {}): RouteOutcome {
  const costs: RoutingCosts = { ...ROUTING_COSTS, ...options.costs }
  const limits: RoutingLimits = { ...ROUTING_LIMITS, ...options.limits }
  const now = options.now ?? (() => Date.now())

  const from = resolveEnd(scene, pipe.from)
  const to = resolveEnd(scene, pipe.to)
  if (!from || !to) return { ok: false, reason: 'missingEnd' }
  const fromPoint = endGeometry(scene, from)?.point
  const toPoint = endGeometry(scene, to)?.point
  const own = [pipe.from, pipe.to].flatMap((e) => (e.kind === 'port' ? [e.equipmentId] : []))
  const field = buildObstacleField(scene, {
    pipeRadius: effectiveRadius(scene, pipe),
    systemId: pipe.systemId,
    spacing: scene.settings.pipeSpacing,
    ownEquipmentIds: own,
    ignorePipeIds: [pipe.id],
    ownEnds: [pipe.from, pipe.to],
  })
  // Vertical straight runs stop at the floor / ceiling (pipe axis one radius away).
  const heights = { zMin: Math.ceil(field.zMin), zMax: Math.floor(field.zMax) }
  const a = stubOf(scene, from, toPoint, heights)
  const b = stubOf(scene, to, fromPoint, heights)
  if (!a || !b) return { ok: false, reason: 'missingEnd' }
  const free = (p: Point3) => !field.blocked(p) && p.z >= field.zMin && p.z <= field.zMax
  if (!free(a.end)) return { ok: false, reason: 'startBlocked' }
  if (!free(b.end)) return { ok: false, reason: 'goalBlocked' }

  // Planes exactly at the spacing from the circuit partner, so the pipe can run beside it
  // at a constant distance whatever the grid step is.
  const companions = options.companions ?? []
  const besides = (axis: 'x' | 'y' | 'z') =>
    companions.flatMap((c) => c.route.flatMap((p) => [p[axis] - c.distance, p[axis] + c.distance]))
  const grid = buildGrid(
    sceneBounds(scene, [a, b], limits.margin),
    scene.settings.routingGrid,
    {
      xs: [a.end.x, b.end.x, ...besides('x')],
      ys: [a.end.y, b.end.y, ...besides('y')],
      zs: [a.end.z, b.end.z, ...besides('z').filter((z) => z >= field.zMin && z <= field.zMax)],
    },
    limits.maxNodes,
    limits.maxGridStep,
  )
  if (!grid) return { ok: false, reason: 'tooLarge' }

  const result = search({
    grid,
    field,
    hasCompanions: companions.length > 0,
    alongside: alongsideTest(companions, grid.step),
    start: a.end,
    startDir: a.dir,
    goal: b.end,
    goalArriveDir: opposite(b.dir),
    costs,
    limits,
    now,
  })
  if (!result.ok) return { ok: false, reason: result.reason, gridStep: grid.step }

  const route = simplifyRoute([a.point, ...result.path, b.point])
  return {
    ok: true,
    route,
    ...routeStats(route),
    crossings: wallCrossings(scene, route),
    gridStep: grid.step,
  }
}
