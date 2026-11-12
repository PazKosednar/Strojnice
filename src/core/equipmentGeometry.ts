import type { Equipment, EquipmentType, Point, Point3, Port, PortDirection } from './scene'

/** Position and rotation: all that is needed to place local coordinates in the plan. */
export type Pose = Pick<Equipment, 'position' | 'rotation'>

/** Plan footprint size; a cylinder occupies a square of its diameter. */
export function footprintSize(type: EquipmentType): { width: number; depth: number } {
  return type.shape.kind === 'box'
    ? { width: type.shape.width, depth: type.shape.depth }
    : { width: type.shape.diameter, depth: type.shape.diameter }
}

export function equipmentHeight(type: EquipmentType): number {
  return type.shape.height
}

/** Normalises any angle to whole degrees in 0-359. */
export function normalizeRotation(degrees: number): number {
  return (((Math.round(degrees) % 360) + 360) % 360) + 0
}

/** cos and sin of a rotation in degrees; exact for multiples of 90°. */
export function rotationTrig(degrees: number): { cos: number; sin: number } {
  switch (normalizeRotation(degrees)) {
    case 0:
      return { cos: 1, sin: 0 }
    case 90:
      return { cos: 0, sin: 1 }
    case 180:
      return { cos: -1, sin: 0 }
    case 270:
      return { cos: 0, sin: -1 }
    default: {
      const rad = (degrees * Math.PI) / 180
      return { cos: Math.cos(rad), sin: Math.sin(rad) }
    }
  }
}

/** Rotates a plan vector counter-clockwise by `degrees`. */
export function rotateVector(degrees: number, v: Point): Point {
  const { cos, sin } = rotationTrig(degrees)
  return { x: v.x * cos - v.y * sin + 0, y: v.x * sin + v.y * cos + 0 }
}

/** Equipment-local plan point -> world plan point (not rounded). */
export function localToWorld(pose: Pose, local: Point): Point {
  const r = rotateVector(pose.rotation, local)
  return { x: pose.position.x + r.x, y: pose.position.y + r.y }
}

/** World polygon (4 corners, counter-clockwise) of a local axis-aligned rectangle. */
export function localRect(pose: Pose, x0: number, y0: number, x1: number, y1: number): Point[] {
  return [
    localToWorld(pose, { x: x0, y: y0 }),
    localToWorld(pose, { x: x1, y: y0 }),
    localToWorld(pose, { x: x1, y: y1 }),
    localToWorld(pose, { x: x0, y: y1 }),
  ]
}

export type Footprint =
  { kind: 'polygon'; points: Point[] } | { kind: 'circle'; center: Point; radius: number }

/** Plan outline of placed equipment: a rotated rectangle or a circle. */
export function equipmentFootprint(equipment: Pick<Equipment, 'type'> & Pose): Footprint {
  const { shape } = equipment.type
  if (shape.kind === 'cylinder') {
    return { kind: 'circle', center: { ...equipment.position }, radius: shape.diameter / 2 }
  }
  const hw = shape.width / 2
  const hd = shape.depth / 2
  return { kind: 'polygon', points: localRect(equipment, -hw, -hd, hw, hd) }
}

const DIRECTION_VECTORS: Record<PortDirection, Point3> = {
  '+x': { x: 1, y: 0, z: 0 },
  '-x': { x: -1, y: 0, z: 0 },
  '+y': { x: 0, y: 1, z: 0 },
  '-y': { x: 0, y: -1, z: 0 },
  '+z': { x: 0, y: 0, z: 1 },
  '-z': { x: 0, y: 0, z: -1 },
}

/** Unit vector of a port direction in equipment-local axes. */
export function directionVector(direction: PortDirection): Point3 {
  return { ...DIRECTION_VECTORS[direction] }
}

/**
 * World position (mm, z above the floor; not rounded) and unit direction of a port of
 * placed equipment.
 */
export function portWorld(
  equipment: Pose & Pick<Equipment, 'elevation'>,
  port: Port,
): { position: Point3; direction: Point3 } {
  const p = localToWorld(equipment, port.position)
  const local = DIRECTION_VECTORS[port.direction]
  const d = rotateVector(equipment.rotation, local)
  return {
    position: { x: p.x, y: p.y, z: equipment.elevation + port.position.z },
    direction: { x: d.x, y: d.y, z: local.z },
  }
}

/** True when the plan point lies inside (or on the edge of) the footprint. */
export function footprintContains(footprint: Footprint, point: Point): boolean {
  if (footprint.kind === 'circle') {
    const dx = point.x - footprint.center.x
    const dy = point.y - footprint.center.y
    return Math.hypot(dx, dy) <= footprint.radius
  }
  // Convex polygon: the point must be on the same side of every edge.
  let sign = 0
  const { points } = footprint
  for (let i = 0; i < points.length; i++) {
    const a = points[i]!
    const b = points[(i + 1) % points.length]!
    const cross = (b.x - a.x) * (point.y - a.y) - (b.y - a.y) * (point.x - a.x)
    if (Math.abs(cross) < 1e-9) continue
    const s = Math.sign(cross)
    if (sign === 0) sign = s
    else if (s !== sign) return false
  }
  return true
}
