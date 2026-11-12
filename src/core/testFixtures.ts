// Shared sample data for tests. The dimensions are arbitrary test values, not real products.
import { createRectangularRoom } from './rectangularRoom'
import {
  createEmptyScene,
  type Equipment,
  type EquipmentType,
  type Scene,
  type Wall,
} from './scene'

export const boxType: EquipmentType = {
  id: 'type-box',
  name: 'Test box',
  tagPrefix: 'IDU',
  shape: { kind: 'box', width: 600, depth: 400, height: 800 },
  mounting: 'wall',
  ports: [
    {
      id: 'p1',
      name: 'Flow',
      systemId: 'supply',
      position: { x: -200, y: 0, z: 0 },
      direction: '-z',
      size: 'DN25',
    },
    {
      id: 'p2',
      name: 'Return',
      systemId: 'return',
      position: { x: 200, y: -200, z: 100 },
      direction: '-y',
      size: 'DN25',
    },
  ],
  clearances: { front: 500, back: 0, left: 100, right: 100, top: 200 },
}

export const cylinderType: EquipmentType = {
  id: 'type-cyl',
  name: 'Test cylinder',
  tagPrefix: 'CYL',
  shape: { kind: 'cylinder', diameter: 600, height: 1500 },
  mounting: 'floor',
  ports: [
    {
      id: 'top',
      name: 'Hot out',
      systemId: 'dhw',
      position: { x: 0, y: 0, z: 1500 },
      direction: '+z',
      size: 'G 3/4',
    },
  ],
}

export function equipment(patch: Partial<Equipment> = {}): Equipment {
  return {
    id: 'e1',
    tag: 'IDU-01',
    type: boxType,
    position: { x: 0, y: 0 },
    elevation: 0,
    rotation: 0,
    ...patch,
  }
}

export function wall(
  id: string,
  sx: number,
  sy: number,
  ex: number,
  ey: number,
  thickness = 200,
): Wall {
  return { id, start: { x: sx, y: sy }, end: { x: ex, y: ey }, thickness, height: 2600 }
}

/** 3200 × 1800 room with walls w1 (bottom), w2 (right), w3 (top), w4 (left). */
export function roomScene(): Scene {
  let n = 0
  const scene = createEmptyScene()
  return { ...scene, walls: createRectangularRoom(3200, 1800, scene.settings, () => `w${++n}`) }
}
