import { describe, expect, it } from 'vitest'
import {
  equipmentFootprint,
  footprintContains,
  footprintSize,
  localToWorld,
  normalizeRotation,
  portWorld,
  rotateVector,
} from './equipmentGeometry'
import { boxType, cylinderType, equipment } from './testFixtures'

describe('footprintSize', () => {
  it('uses width/depth for a box and the diameter for a cylinder', () => {
    expect(footprintSize(boxType)).toEqual({ width: 600, depth: 400 })
    expect(footprintSize(cylinderType)).toEqual({ width: 600, depth: 600 })
  })
})

describe('normalizeRotation', () => {
  it('wraps to whole degrees in 0-359', () => {
    expect(normalizeRotation(360)).toBe(0)
    expect(normalizeRotation(-90)).toBe(270)
    expect(normalizeRotation(450.4)).toBe(90)
  })
})

describe('rotateVector / localToWorld', () => {
  it('rotates counter-clockwise, exactly for right angles', () => {
    expect(rotateVector(90, { x: 100, y: 0 })).toEqual({ x: 0, y: 100 })
    expect(rotateVector(180, { x: 100, y: 50 })).toEqual({ x: -100, y: -50 })
    expect(rotateVector(270, { x: 100, y: 0 })).toEqual({ x: 0, y: -100 })
  })

  it('handles arbitrary angles', () => {
    const v = rotateVector(45, { x: 100, y: 0 })
    expect(v.x).toBeCloseTo(70.711, 2)
    expect(v.y).toBeCloseTo(70.711, 2)
  })

  it('adds the equipment position', () => {
    expect(localToWorld({ position: { x: 1000, y: 500 }, rotation: 90 }, { x: 200, y: 0 })).toEqual(
      { x: 1000, y: 700 },
    )
  })
})

describe('equipmentFootprint', () => {
  it('is a rectangle around the centre for a box', () => {
    const fp = equipmentFootprint(equipment({ position: { x: 1000, y: 1000 } }))
    expect(fp).toEqual({
      kind: 'polygon',
      points: [
        { x: 700, y: 800 },
        { x: 1300, y: 800 },
        { x: 1300, y: 1200 },
        { x: 700, y: 1200 },
      ],
    })
  })

  it('swaps width and depth when rotated by 90°', () => {
    const fp = equipmentFootprint(equipment({ rotation: 90 }))
    if (fp.kind !== 'polygon') throw new Error('expected a polygon')
    const xs = fp.points.map((p) => p.x)
    const ys = fp.points.map((p) => p.y)
    expect([Math.min(...xs), Math.max(...xs)]).toEqual([-200, 200])
    expect([Math.min(...ys), Math.max(...ys)]).toEqual([-300, 300])
  })

  it('is a circle for a cylinder, whatever the rotation', () => {
    const fp = equipmentFootprint(
      equipment({ type: cylinderType, position: { x: 50, y: 60 }, rotation: 37 }),
    )
    expect(fp).toEqual({ kind: 'circle', center: { x: 50, y: 60 }, radius: 300 })
  })
})

describe('portWorld', () => {
  it('places a port using position, rotation and elevation', () => {
    const e = equipment({ position: { x: 1000, y: 1000 }, rotation: 90, elevation: 1200 })
    // p2: local (200, -200, 100), direction -y (front).
    const { position, direction } = portWorld(e, boxType.ports[1]!)
    expect(position).toEqual({ x: 1200, y: 1200, z: 1300 })
    expect(direction).toEqual({ x: 1, y: 0, z: 0 })
  })

  it('keeps vertical directions vertical', () => {
    const e = equipment({ rotation: 123 })
    expect(portWorld(e, boxType.ports[0]!).direction).toEqual({ x: 0, y: 0, z: -1 })
  })
})

describe('footprintContains', () => {
  it('tests points against a rotated rectangle', () => {
    const fp = equipmentFootprint(equipment({ rotation: 90 }))
    expect(footprintContains(fp, { x: 0, y: 250 })).toBe(true)
    expect(footprintContains(fp, { x: 250, y: 0 })).toBe(false)
  })

  it('tests points against a circle', () => {
    const fp = equipmentFootprint(equipment({ type: cylinderType }))
    expect(footprintContains(fp, { x: 200, y: 200 })).toBe(true)
    expect(footprintContains(fp, { x: 250, y: 250 })).toBe(false)
  })
})
