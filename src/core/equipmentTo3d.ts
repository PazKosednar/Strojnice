import { equipmentHeight, footprintSize, portWorld } from './equipmentGeometry'
import type { Scene } from './scene'
import type { Vec3 } from './sceneToBoxes'

/**
 * Port marker in the 3D view: a short stub in the system colour pointing where the pipe
 * leaves. Its length and radius are symbolic (the port size text is never interpreted).
 */
export interface Port3d {
  key: string
  systemId: string
  color: string
  /** Centre of the stub (m). */
  center: Vec3
  /** Unit direction in world axes. */
  direction: Vec3
  length: number
  radius: number
}

/**
 * Placed equipment for the 3D view. World axes (three.js): x = plan x, y = up, z = -plan y;
 * units are metres. `rotationY` is the plan rotation in radians.
 */
export interface Equipment3d {
  id: string
  tag: string
  shape: { kind: 'box'; size: Vec3 } | { kind: 'cylinder'; radius: number; height: number }
  center: Vec3
  rotationY: number
  ports: Port3d[]
  /** Where the tag label is anchored (just above the top face). */
  labelPosition: Vec3
}

const MM = 1 / 1000
export const PORT_STUB_LENGTH = 0.08
export const PORT_STUB_RADIUS = 0.02
/** Colour of ports whose system is not defined in the project. */
export const UNKNOWN_SYSTEM_COLOR = '#888888'
const LABEL_GAP = 0.12

/** Plan mm (x, y, z up) -> three.js metres (x, y up, z = -plan y). */
const toWorld = (x: number, y: number, z: number): Vec3 => [x * MM + 0, z * MM + 0, -y * MM + 0]

/** Converts all placed equipment into 3D primitives. */
export function equipmentTo3d(scene: Scene): Equipment3d[] {
  const colors = new Map(scene.settings.systems.map((s) => [s.id, s.color]))
  return scene.equipment.map((item) => {
    const { width, depth } = footprintSize(item.type)
    const height = equipmentHeight(item.type)
    const { x, y } = item.position

    const ports = item.type.ports.map((port): Port3d => {
      const { position, direction } = portWorld(item, port)
      const dir: Vec3 = [direction.x + 0, direction.z + 0, -direction.y + 0]
      const base = toWorld(position.x, position.y, position.z)
      const half = PORT_STUB_LENGTH / 2
      return {
        key: `${item.id}:${port.id}`,
        systemId: port.systemId,
        color: colors.get(port.systemId) ?? UNKNOWN_SYSTEM_COLOR,
        center: [base[0] + dir[0] * half, base[1] + dir[1] * half, base[2] + dir[2] * half],
        direction: dir,
        length: PORT_STUB_LENGTH,
        radius: PORT_STUB_RADIUS,
      }
    })

    return {
      id: item.id,
      tag: item.tag,
      shape:
        item.type.shape.kind === 'box'
          ? { kind: 'box', size: [width * MM, height * MM, depth * MM] }
          : { kind: 'cylinder', radius: (item.type.shape.diameter / 2) * MM, height: height * MM },
      center: toWorld(x, y, item.elevation + height / 2),
      rotationY: (item.rotation * Math.PI) / 180,
      ports,
      labelPosition: [x * MM + 0, (item.elevation + height) * MM + LABEL_GAP, -y * MM + 0],
    }
  })
}
