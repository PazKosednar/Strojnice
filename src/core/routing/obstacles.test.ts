import { describe, expect, it } from 'vitest'
import type { Scene } from '../scene'
import { boxType, cylinderType, equipment, roomScene } from '../testFixtures'
import { buildObstacleField } from './obstacles'

const options = { pipeRadius: 11, spacing: 50, ownEquipmentIds: [], ignorePipeIds: [] }

function scene(): Scene {
  return {
    ...roomScene(),
    openings: [
      {
        id: 'door',
        wallId: 'w2',
        type: 'door',
        offset: 450,
        width: 900,
        height: 2100,
        sillHeight: 0,
      },
      {
        id: 'win',
        wallId: 'w1',
        type: 'window',
        offset: 1000,
        width: 1200,
        height: 1200,
        sillHeight: 900,
      },
    ],
    equipment: [
      equipment({ id: 'cyl', tag: 'CYL-01', type: cylinderType, position: { x: 1000, y: 900 } }),
      equipment({ id: 'idu', position: { x: 2400, y: 1500 }, elevation: 1200, type: boxType }),
    ],
  }
}

describe('buildObstacleField', () => {
  it('blocks equipment bodies inflated by pipe radius and spacing', () => {
    const field = buildObstacleField(scene(), options)
    // Cylinder radius 300 + 11 + 50 = 361.
    expect(field.blocked({ x: 1000 + 350, y: 900, z: 500 })).toBe(true)
    expect(field.blocked({ x: 1000 + 370, y: 900, z: 500 })).toBe(false)
    // Above the cylinder (height 1500 + 61), beside the reserved run of its top port.
    expect(field.blocked({ x: 1150, y: 900, z: 1570 })).toBe(false)
  })

  it('lets the pipe come closer to its own equipment', () => {
    const field = buildObstacleField(scene(), { ...options, ownEquipmentIds: ['cyl'] })
    expect(field.blocked({ x: 1000 + 320, y: 900, z: 500 })).toBe(false)
  })

  it('leaves room under wall-mounted equipment', () => {
    const field = buildObstacleField(scene(), options)
    expect(field.blocked({ x: 2400, y: 1500, z: 1000 })).toBe(false)
    expect(field.blocked({ x: 2400, y: 1500, z: 1300 })).toBe(true)
  })

  it('blocks door openings over their full height and windows only above the sill', () => {
    const field = buildObstacleField(scene(), options)
    expect(field.blocked({ x: 3200, y: 900, z: 100 })).toBe(true)
    expect(field.blocked({ x: 1600, y: 0, z: 1200 })).toBe(true)
    expect(field.blocked({ x: 1600, y: 0, z: 600 })).toBe(false)
    expect(field.inWall({ x: 1600, y: 0, z: 600 })).toBe(true)
  })

  it('detects wall bodies (with the pipe radius) and measures the distance to wall faces', () => {
    const field = buildObstacleField(scene(), options)
    expect(field.inWall({ x: 500, y: 105, z: 500 })).toBe(true)
    expect(field.inWall({ x: 500, y: 120, z: 500 })).toBe(false)
    expect(field.wallDistance(500, 400)).toBe(300)
    expect(field.wallDistance(1600, 900)).toBe(800)
    expect(field.wallDistance(500, 0)).toBe(0)
  })

  it('treats other pipes as obstacles, except the ignored ones', () => {
    const withPipe: Scene = {
      ...scene(),
      pipes: [
        {
          id: 'p1',
          systemId: 'supply',
          from: { kind: 'port', equipmentId: 'idu', portId: 'p1' },
          to: { kind: 'port', equipmentId: 'cyl', portId: 'top' },
          outerDiameter: 22,
          route: [
            { x: 500, y: 300, z: 200 },
            { x: 2500, y: 300, z: 200 },
          ],
          mode: 'auto',
        },
      ],
    }
    // 11 + 11 + 50 = 72 around the centre line.
    expect(buildObstacleField(withPipe, options).blocked({ x: 1000, y: 360, z: 200 })).toBe(true)
    expect(buildObstacleField(withPipe, options).blocked({ x: 1000, y: 380, z: 200 })).toBe(false)
    const ignoring = { ...options, ignorePipeIds: ['p1'] }
    expect(buildObstacleField(withPipe, ignoring).blocked({ x: 1000, y: 360, z: 200 })).toBe(false)
  })

  it('keeps the straight run out of other ports free, but not of its own ends', () => {
    const withPort: Scene = {
      ...roomScene(),
      equipment: [equipment({ id: 'idu', position: { x: 1600, y: 1300 }, type: boxType })],
    }
    // boxType port p2: local (200, -200, 100) facing -y -> run from (1800, 1100) to (1800, 1000).
    const p = { x: 1800, y: 1050, z: 100 }
    const near = { ...options, ownEquipmentIds: ['idu'] }
    expect(buildObstacleField(withPort, near).blocked(p)).toBe(true)
    const own = {
      ...near,
      ownEnds: [{ kind: 'port' as const, equipmentId: 'idu', portId: 'p2' }],
    }
    expect(buildObstacleField(withPort, own).blocked(p)).toBe(false)
  })

  it('reports clearance zones of other equipment only', () => {
    // Front of IDU at y = 1300, front clearance 500 -> zone y 800..1300, z 1200..2000.
    const p = { x: 2400, y: 1000, z: 1500 }
    expect(buildObstacleField(scene(), options).inClearance(p)).toBe(true)
    expect(
      buildObstacleField(scene(), { ...options, ownEquipmentIds: ['idu'] }).inClearance(p),
    ).toBe(false)
  })

  it('keeps the centre line between floor and ceiling', () => {
    const field = buildObstacleField(scene(), options)
    expect(field.zMin).toBe(11)
    expect(field.zMax).toBe(2600 - 11)
  })
})
