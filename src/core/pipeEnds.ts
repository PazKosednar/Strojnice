import { portWorld } from './equipmentGeometry'
import type { Equipment, Pipe, PipeEnd, Point3, Port, Scene, WallTerminal } from './scene'
import { pointAtOffset, wallDirection } from './wallGeometry'

/** Stable key of a pipe end, for "one pipe per end" checks. */
export function pipeEndKey(end: PipeEnd): string {
  return end.kind === 'port'
    ? `port:${end.equipmentId}:${end.portId}`
    : `terminal:${end.terminalId}`
}

export function sameEnd(a: PipeEnd, b: PipeEnd): boolean {
  return pipeEndKey(a) === pipeEndKey(b)
}

/** What a pipe end refers to, resolved against the scene. */
export type ResolvedEnd =
  { kind: 'port'; equipment: Equipment; port: Port } | { kind: 'terminal'; terminal: WallTerminal }

export function resolveEnd(scene: Scene, end: PipeEnd): ResolvedEnd | null {
  if (end.kind === 'port') {
    const equipment = scene.equipment.find((e) => e.id === end.equipmentId)
    const port = equipment?.type.ports.find((p) => p.id === end.portId)
    return equipment && port ? { kind: 'port', equipment, port } : null
  }
  const terminal = scene.terminals.find((t) => t.id === end.terminalId)
  return terminal ? { kind: 'terminal', terminal } : null
}

export function endSystemId(end: ResolvedEnd): string {
  return end.kind === 'port' ? end.port.systemId : end.terminal.systemId
}

/** Outer diameter at an end; undefined when a port has none entered yet. */
export function endDiameter(end: ResolvedEnd): number | undefined {
  return end.kind === 'port' ? end.port.outerDiameter : end.terminal.outerDiameter
}

/** "CYL-01 / Hladna voda" or "IZ-01". */
export function endLabel(end: ResolvedEnd): string {
  return end.kind === 'port' ? `${end.equipment.tag} / ${end.port.name}` : end.terminal.tag
}

export interface EndGeometry {
  /** Connection point (mm, not rounded). */
  point: Point3
  /** Unit direction in which the pipe leaves the end. */
  direction: Point3
}

/**
 * Where a pipe attaches and in which direction it leaves. A wall terminal lies on the
 * wall axis; the pipe leaves it perpendicular to the wall, towards `towards` when given
 * (so it enters the room the pipe runs in), otherwise to the left side of the wall.
 */
export function endGeometry(scene: Scene, end: ResolvedEnd, towards?: Point3): EndGeometry | null {
  if (end.kind === 'port') {
    const { position, direction } = portWorld(end.equipment, end.port)
    return { point: position, direction }
  }
  const wall = scene.walls.find((w) => w.id === end.terminal.wallId)
  if (!wall) return null
  const p = pointAtOffset(wall, end.terminal.offset)
  const d = wallDirection(wall)
  let n = { x: -d.y, y: d.x }
  if (towards && (towards.x - p.x) * n.x + (towards.y - p.y) * n.y < 0) n = { x: -n.x, y: -n.y }
  return {
    point: { x: p.x, y: p.y, z: end.terminal.height },
    direction: { x: n.x + 0, y: n.y + 0, z: 0 },
  }
}

/** Pipes attached to an equipment item or a terminal. */
export function pipesAt(scene: Scene, id: string): Pipe[] {
  const touches = (end: PipeEnd) =>
    end.kind === 'port' ? end.equipmentId === id : end.terminalId === id
  return scene.pipes.filter((p) => touches(p.from) || touches(p.to))
}
