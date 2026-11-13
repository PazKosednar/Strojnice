import { stubOf } from './routing/stubs'
import { resolveEnd } from './pipeEnds'
import type { Point3, Scene } from './scene'
import type { Vec3 } from './sceneToBoxes'

/** Straight pipe piece as a cylinder between two points (metres, three.js axes). */
export interface PipeSegment3d {
  key: string
  pipeId: string
  systemId: string
  start: Vec3
  end: Vec3
  radius: number
  color: string
}

/** Sphere at a bend so neighbouring cylinders join smoothly. */
export interface PipeJoint3d {
  key: string
  pipeId: string
  systemId: string
  center: Vec3
  radius: number
  color: string
}

/**
 * Smooth 90° bend: a quarter of a torus. Its arc lies in the plane of `xAxis` and `yAxis`
 * around `center`: from center + xAxis·bendRadius (end of the incoming run) to
 * center + yAxis·bendRadius (start of the outgoing run).
 */
export interface PipeElbow3d {
  key: string
  pipeId: string
  systemId: string
  center: Vec3
  xAxis: Vec3
  yAxis: Vec3
  /** Radius of the bend centre line (m). */
  bendRadius: number
  /** Pipe radius (m). */
  radius: number
  color: string
}

export interface Pipes3d {
  segments: PipeSegment3d[]
  /** Bends where the runs are too short for an elbow: a sphere. */
  joints: PipeJoint3d[]
  elbows: PipeElbow3d[]
  /** Short stubs out of wall terminals (from the wall axis to just beyond the face). */
  terminals: PipeSegment3d[]
}

const MM = 1 / 1000
/** Plan mm (x, y, z up) -> three.js metres (x, y up, z = -plan y). */
const toWorld = (p: Point3): Vec3 => [p.x * MM + 0, p.z * MM + 0, -p.y * MM + 0]
/** Colour of pipes and terminals whose system is not defined in the project. */
export const UNKNOWN_PIPE_COLOR = '#888888'
/** How far a terminal stub sticks out of the wall face (mm). */
export const TERMINAL_STUB_OUT = 60

/**
 * Centre-line radius of the drawn bends as a multiple of the outer diameter. A drawing
 * value for a realistic look (copper press bends are of this order), not a standard.
 */
export const BEND_RADIUS_FACTOR = 1.5

const unit = (a: Point3, b: Point3): Point3 => {
  const l = Math.abs(b.x - a.x) + Math.abs(b.y - a.y) + Math.abs(b.z - a.z)
  return { x: (b.x - a.x) / l, y: (b.y - a.y) / l, z: (b.z - a.z) / l }
}
const dist = (a: Point3, b: Point3) =>
  Math.abs(b.x - a.x) + Math.abs(b.y - a.y) + Math.abs(b.z - a.z)
const move = (p: Point3, d: Point3, mm: number): Point3 => ({
  x: p.x + d.x * mm,
  y: p.y + d.y * mm,
  z: p.z + d.z * mm,
})
/** Plan direction -> three.js direction. */
const dirToWorld = (d: Point3): Vec3 => [d.x + 0, d.z + 0, -d.y + 0]

/** Converts routed pipes and wall terminals into cylinders, bends and stubs for the 3D view. */
export function pipesTo3d(scene: Scene): Pipes3d {
  const colors = new Map(scene.settings.systems.map((s) => [s.id, s.color]))
  const color = (systemId: string) => colors.get(systemId) ?? UNKNOWN_PIPE_COLOR
  const segments: PipeSegment3d[] = []
  const joints: PipeJoint3d[] = []

  const elbows: PipeElbow3d[] = []

  for (const pipe of scene.pipes) {
    const route = pipe.route
    const radius = (pipe.outerDiameter / 2) * MM
    const base = { pipeId: pipe.id, systemId: pipe.systemId, radius, color: color(pipe.systemId) }
    // Bend radius at every inner point (mm): limited by half of each neighbouring run.
    const bend = route.map((p, i) => {
      const prev = route[i - 1]
      const next = route[i + 1]
      if (!prev || !next) return 0
      return Math.min(BEND_RADIUS_FACTOR * pipe.outerDiameter, dist(prev, p) / 2, dist(p, next) / 2)
    })
    route.forEach((p, i) => {
      const q = route[i + 1]
      if (q) {
        const d = unit(p, q)
        segments.push({
          ...base,
          key: `${pipe.id}:s${i}`,
          start: toWorld(move(p, d, bend[i]!)),
          end: toWorld(move(q, d, -bend[i + 1]!)),
        })
      }
      const prev = route[i - 1]
      if (!prev || !q) return
      const r = bend[i]!
      // Too tight for a visible arc: a sphere closes the joint instead.
      if (r < pipe.outerDiameter / 2) {
        joints.push({ ...base, key: `${pipe.id}:j${i}`, center: toWorld(p) })
        return
      }
      const a = unit(prev, p)
      const b = unit(p, q)
      elbows.push({
        ...base,
        key: `${pipe.id}:e${i}`,
        center: toWorld(move(move(p, a, -r), b, r)),
        // From the centre: -b points to the end of the incoming run, a to the outgoing one.
        xAxis: dirToWorld({ x: -b.x, y: -b.y, z: -b.z }),
        yAxis: dirToWorld(a),
        bendRadius: r * MM,
      })
    })
  }

  const terminals: PipeSegment3d[] = []
  for (const terminal of scene.terminals) {
    const resolved = resolveEnd(scene, { kind: 'terminal', terminalId: terminal.id })
    const wall = scene.walls.find((w) => w.id === terminal.wallId)
    if (!resolved || !wall) continue
    // Stick out on the side where the connected pipe runs (or the left side of the wall).
    const pipe = scene.pipes.find(
      (p) =>
        (p.from.kind === 'terminal' && p.from.terminalId === terminal.id) ||
        (p.to.kind === 'terminal' && p.to.terminalId === terminal.id),
    )
    // The route point next to the terminal tells on which side of the wall the pipe runs.
    const startsHere = pipe?.from.kind === 'terminal' && pipe.from.terminalId === terminal.id
    const neighbour = startsHere ? pipe?.route[1] : pipe?.route[pipe.route.length - 2]
    const stub = stubOf(scene, resolved, neighbour)
    if (!stub) continue
    const out = wall.thickness / 2 + TERMINAL_STUB_OUT
    const d = { x: Math.sign(stub.end.x - stub.point.x), y: Math.sign(stub.end.y - stub.point.y) }
    terminals.push({
      key: `terminal:${terminal.id}`,
      pipeId: '',
      systemId: terminal.systemId,
      start: toWorld(stub.point),
      end: toWorld({ x: stub.point.x + d.x * out, y: stub.point.y + d.y * out, z: stub.point.z }),
      radius: (terminal.outerDiameter / 2) * MM,
      color: color(terminal.systemId),
    })
  }
  return { segments, joints, elbows, terminals }
}
