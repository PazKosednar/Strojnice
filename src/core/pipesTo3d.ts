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

export interface Pipes3d {
  segments: PipeSegment3d[]
  joints: PipeJoint3d[]
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

/** Converts routed pipes and wall terminals into cylinders and spheres for the 3D view. */
export function pipesTo3d(scene: Scene): Pipes3d {
  const colors = new Map(scene.settings.systems.map((s) => [s.id, s.color]))
  const color = (systemId: string) => colors.get(systemId) ?? UNKNOWN_PIPE_COLOR
  const segments: PipeSegment3d[] = []
  const joints: PipeJoint3d[] = []

  for (const pipe of scene.pipes) {
    const radius = (pipe.outerDiameter / 2) * MM
    pipe.route.forEach((p, i) => {
      const q = pipe.route[i + 1]
      if (q) {
        segments.push({
          key: `${pipe.id}:s${i}`,
          pipeId: pipe.id,
          systemId: pipe.systemId,
          start: toWorld(p),
          end: toWorld(q),
          radius,
          color: color(pipe.systemId),
        })
      }
      if (i > 0 && q) {
        joints.push({
          key: `${pipe.id}:j${i}`,
          pipeId: pipe.id,
          systemId: pipe.systemId,
          center: toWorld(p),
          radius,
          color: color(pipe.systemId),
        })
      }
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
  return { segments, joints, terminals }
}
