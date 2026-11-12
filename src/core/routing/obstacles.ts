import { clearanceZones } from '../clearances'
import {
  equipmentHeight,
  footprintContains,
  footprintSize,
  rotationTrig,
} from '../equipmentGeometry'
import type { Footprint } from '../equipmentGeometry'
import { pipeEndKey, resolveEnd } from '../pipeEnds'
import type { PipeEnd, Point3, RoutePoint, Scene, Wall } from '../scene'
import { wallDirection, wallLength } from '../wallGeometry'
import { wallExtensions } from '../wallJoins'
import { stubOf } from './stubs'

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
  /** Radius of the pipe being routed. */
  pipeRadius: number
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

export function buildObstacleField(scene: Scene, options: ObstacleOptions): ObstacleField {
  const r = options.pipeRadius
  const walls = wallFrames(scene)
  const own = new Set(options.ownEquipmentIds)
  const ignored = new Set(options.ignorePipeIds)

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

  const equipment: EquipmentBlock[] = scene.equipment.map((e) => {
    const { width, depth } = footprintSize(e.type)
    const { cos, sin } = rotationTrig(e.rotation)
    return {
      cx: e.position.x,
      cy: e.position.y,
      cos,
      sin,
      hw: width / 2,
      hd: depth / 2,
      radius: e.type.shape.kind === 'cylinder' ? e.type.shape.diameter / 2 : null,
      z0: e.elevation,
      z1: e.elevation + equipmentHeight(e.type),
      // The pipe may come close to its own equipment (it starts there), not to others.
      inflation: own.has(e.id) ? r : r + options.spacing,
    }
  })

  const pipeBoxes: Box3[] = []
  for (const pipe of scene.pipes) {
    if (ignored.has(pipe.id)) continue
    const inflation = r + pipe.outerDiameter / 2 + options.spacing
    pipe.route.forEach((p: RoutePoint, i) => {
      const q = pipe.route[i + 1]
      if (!q) return
      pipeBoxes.push({
        x0: Math.min(p.x, q.x) - inflation,
        x1: Math.max(p.x, q.x) + inflation,
        y0: Math.min(p.y, q.y) - inflation,
        y1: Math.max(p.y, q.y) + inflation,
        z0: Math.min(p.z, q.z) - inflation,
        z1: Math.max(p.z, q.z) + inflation,
      })
    })
  }

  const ownKeys = new Set((options.ownEnds ?? []).map(pipeEndKey))
  for (const item of scene.equipment) {
    for (const port of item.type.ports) {
      const end: PipeEnd = { kind: 'port', equipmentId: item.id, portId: port.id }
      if (ownKeys.has(pipeEndKey(end))) continue
      const resolved = resolveEnd(scene, end)
      const stub = resolved && stubOf(scene, resolved)
      if (!stub) continue
      const inflation = r + (port.outerDiameter ?? 0) / 2 + options.spacing
      pipeBoxes.push({
        x0: Math.min(stub.point.x, stub.end.x) - inflation,
        x1: Math.max(stub.point.x, stub.end.x) + inflation,
        y0: Math.min(stub.point.y, stub.end.y) - inflation,
        y1: Math.max(stub.point.y, stub.end.y) + inflation,
        z0: Math.min(stub.point.z, stub.end.z) - inflation,
        z1: Math.max(stub.point.z, stub.end.z) + inflation,
      })
    }
  }

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

  const inPipe = (p: Point3) =>
    pipeBoxes.some(
      (b) => p.x > b.x0 && p.x < b.x1 && p.y > b.y0 && p.y < b.y1 && p.z > b.z0 && p.z < b.z1,
    )

  const inOpening = (p: Point3) =>
    openings.some((o) => {
      if (p.z <= o.z0 || p.z >= o.z1) return false
      const { u, v } = toWallFrame(o.wall, p.x, p.y)
      return u > o.u0 && u < o.u1 && Math.abs(v) < o.wall.half + r
    })

  return {
    blocked: (p) => inEquipment(p) || inPipe(p) || inOpening(p),
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
  }
}
