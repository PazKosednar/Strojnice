import { endGeometry, type ResolvedEnd } from '../pipeEnds'
import type { Point3, Scene } from '../scene'

/** Axis directions: 0 +x, 1 -x, 2 +y, 3 -y, 4 +z, 5 -z. */
export const DIRS: readonly Point3[] = [
  { x: 1, y: 0, z: 0 },
  { x: -1, y: 0, z: 0 },
  { x: 0, y: 1, z: 0 },
  { x: 0, y: -1, z: 0 },
  { x: 0, y: 0, z: 1 },
  { x: 0, y: 0, z: -1 },
]

export const opposite = (d: number) => d ^ 1

/** Nearest axis direction to a (possibly diagonal) unit vector. */
export function axisDir(v: Point3): number {
  const ax = Math.abs(v.x)
  const ay = Math.abs(v.y)
  const az = Math.abs(v.z)
  if (az >= ax && az >= ay) return v.z >= 0 ? 4 : 5
  if (ax >= ay) return v.x >= 0 ? 0 : 1
  return v.y >= 0 ? 2 : 3
}

/** Straight run of a pipe out of a port or wall terminal. */
export interface Stub {
  /** Connection point (rounded to mm). */
  point: Point3
  /** End of the straight run. */
  end: Point3
  /** Direction from the connection along the straight run (index into DIRS). */
  dir: number
}

/** Allowed heights of a stub end (pipe axis): floor and ceiling minus the pipe radius. */
export interface StubHeightRange {
  zMin: number
  zMax: number
}

/**
 * The straight run out of an end: `settings.portStraight` long along the end direction
 * (snapped to the nearest axis). A wall terminal first leaves the wall (half its
 * thickness), on the side of `towards`. With `heights`, a vertical run is shortened so it
 * ends within them (e.g. a connection facing down just above the floor).
 */
export function stubOf(
  scene: Scene,
  end: ResolvedEnd,
  towards?: Point3,
  heights?: StubHeightRange,
): Stub | null {
  const geometry = endGeometry(scene, end, towards)
  if (!geometry) return null
  const dir = axisDir(geometry.direction)
  const point = {
    x: Math.round(geometry.point.x),
    y: Math.round(geometry.point.y),
    z: Math.round(geometry.point.z),
  }
  let length = scene.settings.portStraight
  if (end.kind === 'terminal') {
    const wall = scene.walls.find((w) => w.id === end.terminal.wallId)
    length += Math.ceil((wall?.thickness ?? 0) / 2)
  }
  const d = DIRS[dir]!
  if (heights && d.z < 0) length = Math.max(0, Math.min(length, point.z - heights.zMin))
  if (heights && d.z > 0) length = Math.max(0, Math.min(length, heights.zMax - point.z))
  return {
    point,
    end: { x: point.x + d.x * length, y: point.y + d.y * length, z: point.z + d.z * length },
    dir,
  }
}
