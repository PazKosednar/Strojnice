import { clearanceZones } from '../clearances'
import {
  equipmentHeight,
  footprintContains,
  footprintSize,
  rotationTrig,
} from '../equipmentGeometry'
import type { Footprint } from '../equipmentGeometry'
import { pipeEndKey, resolveEnd } from '../pipeEnds'
import { effectiveRadius, insulationOf } from '../pipeSize'
import {
  portStubSegments,
  segmentDistance,
  segmentsOutsidePortStubs,
  type Segment,
} from '../rules/geometry'
import type { PipeEnd, PlanBox, Point3, Scene, Wall } from '../scene'
import { wallDirection, wallLength } from '../wallGeometry'
import { wallExtensions } from '../wallJoins'
import { routeRules, type RouteRules } from './ruleField'
import { stubOf } from './stubs'

/** Index of -z in DIRS (see stubs.ts). */
const DOWN = 5

/** Wall body in its own frame: u along the axis from the start, v across, z up. */
interface WallFrame {
  id: string
  sx: number
  sy: number
  dx: number
  dy: number
  /** u range of the body (includes corner extensions). */
  u0: number
  u1: number
  half: number
  height: number
}

interface OpeningBlock {
  wall: WallFrame
  u0: number
  u1: number
  z0: number
  z1: number
}

interface EquipmentBlock {
  cx: number
  cy: number
  cos: number
  sin: number
  hw: number
  hd: number
  radius: number | null
  z0: number
  z1: number
  inflation: number
}

interface Box3 {
  x0: number
  x1: number
  y0: number
  y1: number
  z0: number
  z1: number
}

interface ClearanceBlock {
  footprint: Footprint
  z0: number
  z1: number
}

export interface ObstacleOptions {
  /** Radius of the pipe being routed, insulation included. */
  pipeRadius: number
  /** System of the pipe being routed; project rules for it apply. Without it, none do. */
  systemId?: string
  /** Clear gap to other pipes and to equipment. */
  spacing: number
  /** Equipment at the ends of the pipe: their own clearance zones are ignored. */
  ownEquipmentIds: readonly string[]
  /** Pipes that are not obstacles (the pipe being routed). */
  ignorePipeIds: readonly string[]
  /**
   * Ends of the pipe being routed. The straight runs out of all OTHER ports are kept free
   * (reserved), so a pipe routed earlier never closes off a port needed later.
   */
  ownEnds?: readonly PipeEnd[]
}

/**
 * Everything the router needs to know about the space, as fast point tests.
 * All lengths in mm; points are plan x/y plus height z.
 */
export interface ObstacleField {
  /** True when a pipe centre line may not pass through this point. */
  blocked(p: Point3): boolean
  /** True when the point lies in a wall body (crossing allowed at a cost). */
  inWall(p: Point3): boolean
  /** True when the point lies in the clearance zone of other equipment. */
  inClearance(p: Point3): boolean
  /** Distance in plan to the nearest wall face (0 inside a wall). */
  wallDistance(x: number, y: number): number
  /** Lowest and highest allowed centre-line height. */
  zMin: number
  zMax: number
  /** Zone the point lies in ('avoid' wins over 'preferred'), or null. */
  zoneAt(p: Point3): 'avoid' | 'preferred' | null
  /** True when the scene has a preferred zone (the cost per mm can then drop below 1). */
  hasPreferredZones: boolean
  /** Number of soft rules (spacing, obstacle distance) broken at this point. */
  softViolations(p: Point3): number
  /**
   * Rules on a straight grid edge (height range, vertical order): -1 when a prohibition is
   * broken, otherwise the number of broken penalties.
   */
  edgeRules(a: Point3, b: Point3): number
  /** Passing through wall bodies under the project rules. */
  wallCrossing: RouteRules['wallCrossing']
}

function wallFrames(scene: Scene): WallFrame[] {
  const extensions = wallExtensions(scene.walls)
  return scene.walls.map((wall: Wall) => {
    const d = wallDirection(wall)
    const ext = extensions.get(wall.id) ?? { start: 0, end: 0 }
    return {
      id: wall.id,
      sx: wall.start.x,
      sy: wall.start.y,
      dx: d.x,
      dy: d.y,
      u0: -ext.start,
      u1: wallLength(wall) + ext.end,
      half: wall.thickness / 2,
      height: wall.height,
    }
  })
}

function toWallFrame(w: WallFrame, x: number, y: number): { u: number; v: number } {
  const rx = x - w.sx
  const ry = y - w.sy
  return { u: rx * w.dx + ry * w.dy, v: -rx * w.dy + ry * w.dx }
}

const segmentBox = (s: { a: Point3; b: Point3 }, inflation: number): Box3 => ({
  x0: Math.min(s.a.x, s.b.x) - inflation,
  x1: Math.max(s.a.x, s.b.x) + inflation,
  y0: Math.min(s.a.y, s.b.y) - inflation,
  y1: Math.max(s.a.y, s.b.y) + inflation,
  z0: Math.min(s.a.z, s.b.z) - inflation,
  z1: Math.max(s.a.z, s.b.z) + inflation,
})

const inBox = (b: Box3, p: Point3) =>
  p.x > b.x0 && p.x < b.x1 && p.y > b.y0 && p.y < b.y1 && p.z > b.z0 && p.z < b.z1

/** Upright, possibly rotated box (obstacle or zone) as a fast point test with inflation. */
interface UprightBox {
  cx: number
  cy: number
  cos: number
  sin: number
  hw: number
  hd: number
  z0: number
  z1: number
}

function uprightBox(box: PlanBox): UprightBox {
  const { cos, sin } = rotationTrig(box.rotation)
  return {
    cx: box.center.x,
    cy: box.center.y,
    cos,
    sin,
    hw: box.width / 2,
    hd: box.depth / 2,
    z0: box.bottom,
    z1: box.bottom + box.height,
  }
}

function inUpright(b: UprightBox, p: Point3, inflation: number): boolean {
  if (p.z <= b.z0 - inflation || p.z >= b.z1 + inflation) return false
  const dx = p.x - b.cx
  const dy = p.y - b.cy
  const lx = dx * b.cos + dy * b.sin
  const ly = -dx * b.sin + dy * b.cos
  return Math.abs(lx) < b.hw + inflation && Math.abs(ly) < b.hd + inflation
}

/** Horizontal run of another pipe, for vertical-order rules. */
interface Run {
  axis: 'x' | 'y'
  lo: number
  hi: number
  across: number
  z: number
}

function horizontalRuns(segments: readonly Segment[]): Run[] {
  return segments
    .filter((s) => s.a.z === s.b.z)
    .map((s) => {
      const axis = s.a.x !== s.b.x ? 'x' : 'y'
      const across = axis === 'x' ? 'y' : 'x'
      return {
        axis,
        lo: Math.min(s.a[axis], s.b[axis]),
        hi: Math.max(s.a[axis], s.b[axis]),
        across: s.a[across],
        z: s.a.z,
      }
    })
}

export function buildObstacleField(scene: Scene, options: ObstacleOptions): ObstacleField {
  const r = options.pipeRadius
  const walls = wallFrames(scene)
  const own = new Set(options.ownEquipmentIds)
  const ignored = new Set(options.ignorePipeIds)
  const rules = routeRules(scene, options.systemId)

  const openings: OpeningBlock[] = []
  for (const o of scene.openings) {
    const wall = walls.find((w) => w.id === o.wallId)
    if (!wall) continue
    // Doors are blocked over their whole height; windows between sill and top.
    openings.push({
      wall,
      u0: o.offset - r,
      u1: o.offset + o.width + r,
      z0: o.type === 'door' ? -Infinity : o.sillHeight - r,
      z1: o.sillHeight + o.height + r,
    })
  }

  // A connection facing down needs room below it: under its own equipment, the pipe may
  // pass below the connection height (e.g. leaving an outdoor unit under its casing).
  const openBelow = new Map<string, number>()
  for (const end of options.ownEnds ?? []) {
    if (end.kind !== 'port') continue
    const resolved = resolveEnd(scene, end)
    const stub = resolved && stubOf(scene, resolved)
    if (!stub || stub.dir !== DOWN) continue
    const current = openBelow.get(end.equipmentId)
    openBelow.set(end.equipmentId, Math.min(current ?? Infinity, stub.point.z))
  }

  const equipment: EquipmentBlock[] = scene.equipment.map((e) => {
    const { width, depth } = footprintSize(e.type)
    const { cos, sin } = rotationTrig(e.rotation)
    const below = own.has(e.id) ? openBelow.get(e.id) : undefined
    return {
      cx: e.position.x,
      cy: e.position.y,
      cos,
      sin,
      hw: width / 2,
      hd: depth / 2,
      radius: e.type.shape.kind === 'cylinder' ? e.type.shape.diameter / 2 : null,
      z0: below === undefined ? e.elevation : Math.max(e.elevation, below),
      z1: e.elevation + equipmentHeight(e.type),
      // The pipe may come close to its own equipment (it starts there), not to others.
      inflation: own.has(e.id) ? r : r + options.spacing,
    }
  })

  const pipeBoxes: Box3[] = []
  /** Bands around other pipes where a soft spacing rule would be broken. */
  const softBoxes: Box3[] = []
  const orderRuns: { run: Run; above: boolean; within: number; hard: boolean }[] = []
  // Straight runs out of this pipe's own ends (fixed by the connection positions).
  const ownStubs: Segment[] = (options.ownEnds ?? []).flatMap((end) => {
    const resolved = resolveEnd(scene, end)
    const stub = resolved && stubOf(scene, resolved)
    return stub ? [{ a: stub.point, b: stub.end, index: 0 }] : []
  })
  /**
   * Spacing kept to a fixed straight run of another port: the full spacing, reduced only as
   * far as needed to keep this pipe's own fixed run free (manufacturers place connections
   * closer together than the spacing between routed pipes).
   */
  const spacingNear = (stub: Segment, otherRadius: number, spacing: number) => {
    let result = spacing
    for (const own of ownStubs) {
      const room = segmentDistance(stub, own).distance - r - otherRadius - 1
      result = Math.min(result, Math.max(0, room))
    }
    return result
  }

  for (const pipe of scene.pipes) {
    if (ignored.has(pipe.id) || pipe.route.length < 2) continue
    const otherRadius = effectiveRadius(scene, pipe)
    const touching = r + otherRadius
    const req = rules.spacingTo(pipe.systemId)
    const spacing = Math.max(options.spacing, req.hard ?? 0)
    for (const s of portStubSegments(scene, pipe)) {
      pipeBoxes.push(segmentBox(s, touching + spacingNear(s, otherRadius, spacing)))
    }
    const free = segmentsOutsidePortStubs(scene, pipe)
    for (const s of free) {
      pipeBoxes.push(segmentBox(s, touching + spacingNear(s, otherRadius, spacing)))
    }
    if (req.soft !== null && req.soft > spacing) {
      for (const s of free) softBoxes.push(segmentBox(s, touching + req.soft))
    }
    for (const order of rules.orders) {
      if (order.otherSystemId !== pipe.systemId) continue
      for (const run of horizontalRuns(free)) orderRuns.push({ run, ...order })
    }
  }

  // Straight runs out of all other ports are kept free, so a pipe routed earlier never
  // closes off a port needed later.
  const ownKeys = new Set((options.ownEnds ?? []).map(pipeEndKey))
  for (const item of scene.equipment) {
    for (const port of item.type.ports) {
      const end: PipeEnd = { kind: 'port', equipmentId: item.id, portId: port.id }
      if (ownKeys.has(pipeEndKey(end))) continue
      const resolved = resolveEnd(scene, end)
      const stub = resolved && stubOf(scene, resolved)
      if (!stub) continue
      const portRadius = (port.outerDiameter ?? 0) / 2 + insulationOf(scene, port.systemId)
      const run = { a: stub.point, b: stub.end, index: 0 }
      pipeBoxes.push(
        segmentBox(run, r + portRadius + spacingNear(run, portRadius, options.spacing)),
      )
    }
  }

  const obstacles = scene.obstacles.map((o) => {
    const req = rules.obstacleDistance(o.category)
    const hard = r + Math.max(options.spacing, req.hard ?? 0)
    const soft = req.soft !== null && r + req.soft > hard ? r + req.soft : null
    return { box: uprightBox(o), hard, soft }
  })
  const forbidden = scene.zones.filter((z) => z.kind === 'forbidden').map(uprightBox)
  const avoid = scene.zones.filter((z) => z.kind === 'avoid').map(uprightBox)
  const preferred = scene.zones.filter((z) => z.kind === 'preferred').map(uprightBox)

  const clearances: ClearanceBlock[] = scene.equipment
    .filter((e) => !own.has(e.id))
    .flatMap((e) => clearanceZones(e))

  const maxHeight = Math.max(0, ...scene.walls.map((w) => w.height))

  const inEquipment = (p: Point3) =>
    equipment.some((e) => {
      if (p.z <= e.z0 - e.inflation || p.z >= e.z1 + e.inflation) return false
      const dx = p.x - e.cx
      const dy = p.y - e.cy
      if (e.radius !== null) return Math.hypot(dx, dy) < e.radius + e.inflation
      const lx = dx * e.cos + dy * e.sin
      const ly = -dx * e.sin + dy * e.cos
      return Math.abs(lx) < e.hw + e.inflation && Math.abs(ly) < e.hd + e.inflation
    })

  const inPipe = (p: Point3) => pipeBoxes.some((b) => inBox(b, p))
  const inObstacle = (p: Point3) => obstacles.some((o) => inUpright(o.box, p, o.hard))
  const inForbidden = (p: Point3) => forbidden.some((z) => inUpright(z, p, r))

  /** Horizontal edges: height ranges and vertical order against other systems. */
  const edgeRules = (a: Point3, b: Point3): number => {
    if (a.z !== b.z) return 0
    let soft = 0
    for (const range of rules.heightRanges) {
      const out = (range.min !== null && a.z < range.min) || (range.max !== null && a.z > range.max)
      if (!out) continue
      if (range.hard) return -1
      soft++
    }
    if (orderRuns.length > 0) {
      const axis = a.x !== b.x ? 'x' : 'y'
      const across = axis === 'x' ? a.y : a.x
      const mid = (a[axis] + b[axis]) / 2
      for (const { run, above, within, hard } of orderRuns) {
        if (run.axis !== axis || mid <= run.lo || mid >= run.hi) continue
        if (Math.abs(run.across - across) > within) continue
        const wrong = above ? a.z <= run.z : a.z >= run.z
        if (!wrong) continue
        if (hard) return -1
        soft++
      }
    }
    return soft
  }

  const inOpening = (p: Point3) =>
    openings.some((o) => {
      if (p.z <= o.z0 || p.z >= o.z1) return false
      const { u, v } = toWallFrame(o.wall, p.x, p.y)
      return u > o.u0 && u < o.u1 && Math.abs(v) < o.wall.half + r
    })

  return {
    blocked: (p) => inEquipment(p) || inPipe(p) || inOpening(p) || inObstacle(p) || inForbidden(p),
    inWall: (p) =>
      walls.some((w) => {
        if (p.z >= w.height + r) return false
        const { u, v } = toWallFrame(w, p.x, p.y)
        return u > w.u0 - r && u < w.u1 + r && Math.abs(v) < w.half + r
      }),
    inClearance: (p) =>
      clearances.some(
        (c) => p.z > c.z0 && p.z < c.z1 && footprintContains(c.footprint, { x: p.x, y: p.y }),
      ),
    wallDistance: (x, y) => {
      let best = Infinity
      for (const w of walls) {
        const { u, v } = toWallFrame(w, x, y)
        const du = Math.max(w.u0 - u, 0, u - w.u1)
        const dv = Math.max(Math.abs(v) - w.half, 0)
        best = Math.min(best, Math.hypot(du, dv))
      }
      return best
    },
    zMin: r,
    zMax: maxHeight > 0 ? maxHeight - r : Infinity,
    zoneAt: (p) =>
      avoid.some((z) => inUpright(z, p, 0))
        ? 'avoid'
        : preferred.some((z) => inUpright(z, p, 0))
          ? 'preferred'
          : null,
    hasPreferredZones: preferred.length > 0,
    softViolations: (p) =>
      softBoxes.filter((b) => inBox(b, p)).length +
      obstacles.filter((o) => o.soft !== null && inUpright(o.box, p, o.soft)).length,
    edgeRules,
    wallCrossing: rules.wallCrossing,
  }
}
