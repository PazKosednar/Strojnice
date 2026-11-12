import type { Point3, Scene } from './scene'
import { wallDirection } from './wallGeometry'

/** Per wall: midpoint of the axis (plan mm) and the outward normal (unit, plan). */
export interface WallFacing {
  id: string
  mid: { x: number; y: number }
  /** Points away from the room centre. */
  normal: { x: number; y: number }
  /** Half the wall height (mm), used as the reference height for the view direction. */
  midHeight: number
}

/**
 * Outward normals of all walls. The room centre is the centre of the walls' bounding box;
 * the outward side of a wall is the side facing away from it. A wall whose axis passes
 * through the centre (free-standing wall in the middle) uses its left side.
 */
export function wallFacings(scene: Scene): WallFacing[] {
  if (scene.walls.length === 0) return []
  const xs = scene.walls.flatMap((w) => [w.start.x, w.end.x])
  const ys = scene.walls.flatMap((w) => [w.start.y, w.end.y])
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2
  return scene.walls.map((wall) => {
    const d = wallDirection(wall)
    let n = { x: -d.y, y: d.x }
    const mid = { x: (wall.start.x + wall.end.x) / 2, y: (wall.start.y + wall.end.y) / 2 }
    if ((mid.x - cx) * n.x + (mid.y - cy) * n.y < 0) n = { x: -n.x, y: -n.y }
    return { id: wall.id, mid, normal: { x: n.x + 0, y: n.y + 0 }, midHeight: wall.height / 2 }
  })
}

/** Thresholds of the clean view (degrees). Hide below `hideBelow`, show again above `showAbove`. */
export const WALL_HIDE_ANGLES = { hideBelow: 70, showAbove: 80 }

/**
 * Whether a wall stands between the camera and the room. Compares the angle between the
 * wall's outward normal and the direction from the wall to the camera (in plan). With
 * hysteresis: a hidden wall reappears only when the angle exceeds `showAbove`, so a wall
 * at the threshold does not flicker. Cameras on the inner side never hide the wall.
 */
export function isWallHidden(
  facing: WallFacing,
  camera: Point3,
  wasHidden: boolean,
  angles = WALL_HIDE_ANGLES,
): boolean {
  const dx = camera.x - facing.mid.x
  const dy = camera.y - facing.mid.y
  const length = Math.hypot(dx, dy)
  if (length < 1e-6) return wasHidden
  const cos = (dx * facing.normal.x + dy * facing.normal.y) / length
  if (cos <= 0) return false
  const angle = (Math.acos(Math.min(1, cos)) * 180) / Math.PI
  return wasHidden ? angle < angles.showAbove : angle < angles.hideBelow
}

/** Thresholds (degrees above the horizon) for the top view, with hysteresis. */
export const TOP_VIEW_ANGLES = { enterAbove: 60, leaveBelow: 55 }

/**
 * Top view: the camera looks down steeply (elevation above `enterAbove` degrees, measured
 * from the target). All walls are then drawn only as a low base.
 */
export function isTopView(
  camera: Point3,
  target: Point3,
  wasTop: boolean,
  angles = TOP_VIEW_ANGLES,
): boolean {
  const horizontal = Math.hypot(camera.x - target.x, camera.y - target.y)
  const elevation = (Math.atan2(camera.z - target.z, horizontal) * 180) / Math.PI
  return wasTop ? elevation > angles.leaveBelow : elevation > angles.enterAbove
}

/** Height of the low base left visible of hidden walls (mm). */
export const WALL_BASE_HEIGHT = 200
