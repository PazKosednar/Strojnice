import { describe, expect, it } from 'vitest'
import { parseEquipmentType } from './equipmentType'
import { modelDimensions, modelOffset } from './modelDimensions'
import { boxType } from './testFixtures'

// Bounds like the Vitocal indoor unit file: 450 wide, 931 high, 365 deep, centred.
const bounds = { min: { x: -225, y: 0, z: -183 }, max: { x: 225, y: 931, z: 182 } }

describe('modelDimensions', () => {
  it('reads width, depth and height from the bounds', () => {
    expect(modelDimensions(bounds, 0)).toEqual({ width: 450, depth: 365, height: 931 })
    expect(modelDimensions(bounds, 180)).toEqual({ width: 450, depth: 365, height: 931 })
  })

  it('swaps width and depth for a quarter turn', () => {
    expect(modelDimensions(bounds, 90)).toEqual({ width: 365, depth: 450, height: 931 })
  })
})

describe('modelOffset', () => {
  it('moves the bottom centre of the bounds to the origin', () => {
    expect(modelOffset({ min: { x: 100, y: 50, z: -40 }, max: { x: 300, y: 950, z: 60 } })).toEqual(
      {
        x: -200,
        y: -50,
        z: -10,
      },
    )
    expect(modelOffset(bounds)).toEqual({ x: 0, y: 0, z: 0.5 })
  })
})

describe('equipment type with a model', () => {
  const user = '11111111-2222-3333-4444-555555555555'
  const type = '66666666-7777-8888-9999-000000000000'
  const withModel = {
    ...boxType,
    model: { path: `${user}/${type}/Vitocal.glb`, fileName: 'Vitocal.glb', rotation: 90, bounds },
  }

  it('accepts a valid model reference', () => {
    expect(parseEquipmentType(JSON.parse(JSON.stringify(withModel)))).toEqual({
      ok: true,
      type: withModel,
    })
  })

  it('rejects unsafe paths, odd rotations and empty bounds', () => {
    const bad = (model: object) =>
      parseEquipmentType({ ...withModel, model: { ...withModel.model, ...model } })
    expect(bad({ path: '../secret.glb' })).toMatchObject({ ok: false })
    expect(bad({ path: `${user}/${type}/sub/x.glb` })).toMatchObject({ ok: false })
    expect(bad({ path: `${user}/${type}/x.exe` })).toMatchObject({ ok: false })
    expect(bad({ rotation: 45 })).toEqual({
      ok: false,
      error: 'type.model.rotation: expected 0, 90, 180 or 270',
    })
    expect(bad({ bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 1, z: 1 } } })).toEqual({
      ok: false,
      error: 'type.model.bounds: max must be greater than min',
    })
  })
})
