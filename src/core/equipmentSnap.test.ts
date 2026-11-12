import { describe, expect, it } from 'vitest'
import { bodiesCollide } from './collisions'
import { equipmentFootprint } from './equipmentGeometry'
import { snapEquipmentToWall } from './equipmentSnap'
import { boxType, cylinderType, wall } from './testFixtures'
import { wallOutline } from './wallJoins'

const options = { tolerance: 100, gridSize: 50 }
const bottom = wall('w1', 0, 0, 3200, 0) // thickness 200 -> faces at y = ±100

describe('snapEquipmentToWall', () => {
  it('sets the back against the wall face on the cursor side', () => {
    // Box depth 400: centre = face (100) + 200.
    expect(snapEquipmentToWall(boxType, { x: 1010, y: 240 }, [bottom], options)).toEqual({
      position: { x: 1000, y: 300 },
      rotation: 180,
      wallId: 'w1',
    })
  })

  it('uses the other face when the cursor is on the other side', () => {
    expect(snapEquipmentToWall(boxType, { x: 1010, y: -150 }, [bottom], options)).toEqual({
      position: { x: 1000, y: -300 },
      rotation: 0,
      wallId: 'w1',
    })
  })

  it('aligns with a vertical wall', () => {
    const right = wall('w2', 3200, 0, 3200, 1800)
    // Cursor inside the room (left of the wall): back must face +x.
    const placement = snapEquipmentToWall(boxType, { x: 3000, y: 900 }, [right], options)
    expect(placement).toEqual({ position: { x: 2900, y: 900 }, rotation: 270, wallId: 'w2' })
  })

  it('uses the radius for a cylinder', () => {
    const placement = snapEquipmentToWall(cylinderType, { x: 500, y: 300 }, [bottom], options)
    expect(placement?.position).toEqual({ x: 500, y: 400 })
  })

  it('returns null when no wall is near enough', () => {
    expect(snapEquipmentToWall(boxType, { x: 1000, y: 900 }, [bottom], options)).toBeNull()
  })

  it('picks the nearest wall', () => {
    const right = wall('w2', 3200, 0, 3200, 1800)
    const placement = snapEquipmentToWall(boxType, { x: 2950, y: 320 }, [bottom, right], options)
    expect(placement?.wallId).toBe('w2')
  })

  it('keeps the equipment within the wall length', () => {
    const placement = snapEquipmentToWall(boxType, { x: 3290, y: 150 }, [bottom], options)
    expect(placement?.position.x).toBe(3200)
  })

  it('aligns with a slanted wall without entering it', () => {
    const slanted = wall('w', 0, 0, 3000, 1000) // 18.43°, not a whole degree
    const placement = snapEquipmentToWall(boxType, { x: 1400, y: 800 }, [slanted], options)!
    expect(placement.rotation).toBe(198)
    const body = {
      footprint: equipmentFootprint({ type: boxType, ...placement }),
      z0: 0,
      z1: 800,
    }
    const wallBody = {
      footprint: { kind: 'polygon' as const, points: wallOutline(slanted) },
      z0: 0,
      z1: 2600,
    }
    expect(bodiesCollide(body, wallBody)).toBe(false)
    // ... and it is still close to the face (gap of a few mm at most).
    expect(bodiesCollide(body, wallBody, -8)).toBe(true)
  })
})
