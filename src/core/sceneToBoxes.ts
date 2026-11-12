import type { Opening, Scene, Wall } from './scene'
import { wallAngle, wallDirection, wallLength } from './wallGeometry'
import { wallExtensions, wallOutline, type WallExtension } from './wallJoins'

/** [x, y, z] in metres. */
export type Vec3 = [number, number, number]

/**
 * Axis-aligned box in its own frame, rotated about the world Y axis.
 * World axes (three.js): x = plan x, y = up (height), z = -plan y.
 * Units are metres. Local x runs along the wall, local z across its thickness.
 */
export interface Box3d {
  key: string
  kind: 'wall' | 'floor'
  /** Scene element this box belongs to (wall id; empty for the floor). */
  elementId: string
  center: Vec3
  size: Vec3
  rotationY: number
}

const MM = 1 / 1000
/** Floor slab thickness in metres; its top is at height 0. */
export const FLOOR_THICKNESS = 0.02

interface Piece {
  u0: number
  u1: number
  z0: number
  z1: number
}

/** Splits a wall into solid pieces around its openings (along u, height z; mm). */
function wallPieces(wall: Wall, openings: readonly Opening[], ext: WallExtension): Piece[] {
  const pieces: Piece[] = []
  const add = (u0: number, u1: number, z0: number, z1: number) => {
    if (u1 - u0 > 1e-9 && z1 - z0 > 1e-9) pieces.push({ u0, u1, z0, z1 })
  }
  const sorted = [...openings].sort((a, b) => a.offset - b.offset)
  let u = -ext.start
  for (const o of sorted) {
    add(u, o.offset, 0, wall.height)
    add(o.offset, o.offset + o.width, 0, o.sillHeight)
    add(o.offset, o.offset + o.width, o.sillHeight + o.height, wall.height)
    u = o.offset + o.width
  }
  add(u, wallLength(wall) + ext.end, 0, wall.height)
  return pieces
}

function wallBoxes(wall: Wall, openings: readonly Opening[], ext: WallExtension): Box3d[] {
  const d = wallDirection(wall)
  const rotationY = wallAngle(wall)
  return wallPieces(wall, openings, ext).map((p, i) => {
    const mid = (p.u0 + p.u1) / 2
    const px = wall.start.x + d.x * mid
    const py = wall.start.y + d.y * mid
    return {
      key: `${wall.id}:${i}`,
      kind: 'wall',
      elementId: wall.id,
      center: [px * MM, ((p.z0 + p.z1) / 2) * MM, -py * MM + 0],
      size: [(p.u1 - p.u0) * MM, (p.z1 - p.z0) * MM, wall.thickness * MM],
      rotationY,
    }
  })
}

function floorBox(scene: Scene, extensions: Map<string, WallExtension>): Box3d | null {
  const points = scene.walls.flatMap((w) => wallOutline(w, extensions.get(w.id)))
  if (points.length === 0) return null
  const xs = points.map((p) => p.x)
  const ys = points.map((p) => p.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  return {
    key: 'floor',
    kind: 'floor',
    elementId: '',
    center: [((minX + maxX) / 2) * MM, -FLOOR_THICKNESS / 2, (-(minY + maxY) / 2) * MM + 0],
    size: [(maxX - minX) * MM, FLOOR_THICKNESS, (maxY - minY) * MM],
    rotationY: 0,
  }
}

/** Converts the scene into boxes for the 3D view: wall pieces around openings + a floor. */
export function sceneToBoxes(scene: Scene): Box3d[] {
  const extensions = wallExtensions(scene.walls)
  const boxes = scene.walls.flatMap((wall) =>
    wallBoxes(
      wall,
      scene.openings.filter((o) => o.wallId === wall.id),
      extensions.get(wall.id) ?? { start: 0, end: 0 },
    ),
  )
  const floor = floorBox(scene, extensions)
  return floor ? [floor, ...boxes] : boxes
}

export interface Bounds3d {
  center: Vec3
  /** Radius of a sphere around the bounding box (half its diagonal, m). */
  radius: number
}

/** Bounding sphere-ish bounds of all boxes (ignores rotation; good enough for the camera). */
export function boxesBounds(boxes: readonly Box3d[]): Bounds3d | null {
  if (boxes.length === 0) return null
  const min: Vec3 = [Infinity, Infinity, Infinity]
  const max: Vec3 = [-Infinity, -Infinity, -Infinity]
  for (const b of boxes) {
    const r = Math.max(b.size[0], b.size[2]) / 2
    const half: Vec3 = [r, b.size[1] / 2, r]
    for (let i = 0; i < 3; i++) {
      min[i] = Math.min(min[i]!, b.center[i]! - half[i]!)
      max[i] = Math.max(max[i]!, b.center[i]! + half[i]!)
    }
  }
  const center: Vec3 = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2]
  const radius = Math.hypot(max[0] - min[0], max[1] - min[1], max[2] - min[2]) / 2
  return { center, radius }
}
