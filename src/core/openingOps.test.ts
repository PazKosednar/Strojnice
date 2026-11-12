import { describe, expect, it } from 'vitest'
import { addOpening, placeOpening, removeOpening, updateOpening } from './openingOps'
import { createRectangularRoom } from './rectangularRoom'
import { createEmptyScene, type Opening, type Scene } from './scene'
import type { SceneResult } from './sceneResult'

function unwrap(result: SceneResult): Scene {
  if (!result.ok) throw new Error(`expected ok, got ${result.error}`)
  return result.scene
}

function room(): Scene {
  let n = 0
  const scene = createEmptyScene()
  return { ...scene, walls: createRectangularRoom(3200, 1800, scene.settings, () => `w${++n}`) }
}

const window1: Opening = {
  id: 'o1',
  wallId: 'w1',
  type: 'window',
  offset: 1000,
  width: 1200,
  height: 1200,
  sillHeight: 900,
}

describe('addOpening', () => {
  it('adds a valid opening', () => {
    expect(unwrap(addOpening(room(), window1)).openings).toEqual([window1])
  })

  it('rejects an opening on an unknown wall', () => {
    expect(addOpening(room(), { ...window1, wallId: 'x' })).toEqual({
      ok: false,
      error: 'notFound',
    })
  })

  it('rejects an invalid opening with the validation reason', () => {
    expect(addOpening(room(), { ...window1, offset: 2500 })).toEqual({
      ok: false,
      error: 'outsideWall',
    })
  })
})

describe('updateOpening', () => {
  it('changes the offset', () => {
    const scene = unwrap(addOpening(room(), window1))
    expect(unwrap(updateOpening(scene, 'o1', { offset: 400 })).openings[0]!.offset).toBe(400)
  })

  it('rejects a change that would overlap another opening', () => {
    let scene = unwrap(addOpening(room(), window1))
    scene = unwrap(addOpening(scene, { ...window1, id: 'o2', offset: 2400, width: 600 }))
    expect(updateOpening(scene, 'o2', { offset: 2000 })).toEqual({ ok: false, error: 'overlap' })
  })

  it('keeps the scene unchanged on error', () => {
    const scene = unwrap(addOpening(room(), window1))
    updateOpening(scene, 'o1', { width: 99999 })
    expect(scene.openings[0]).toEqual(window1)
  })
})

describe('removeOpening', () => {
  it('removes the opening', () => {
    const scene = unwrap(addOpening(room(), window1))
    expect(unwrap(removeOpening(scene, 'o1')).openings).toEqual([])
  })
})

describe('placeOpening', () => {
  it('centres a preset-sized window on the clicked position', () => {
    const scene = unwrap(placeOpening(room(), 'w1', 'window', 1600, 'o9'))
    expect(scene.openings[0]).toEqual({
      id: 'o9',
      wallId: 'w1',
      type: 'window',
      offset: 1000,
      width: 1200,
      height: 1200,
      sillHeight: 900,
    })
  })

  it('clamps to the wall ends', () => {
    const scene = unwrap(placeOpening(room(), 'w1', 'door', 3100, 'd1'))
    expect(scene.openings[0]).toMatchObject({ offset: 2300, width: 900, sillHeight: 0 })
  })

  it('fails when the wall is shorter than the opening', () => {
    const scene = {
      ...room(),
      settings: { ...room().settings, door: { width: 5000, height: 2100, sillHeight: 0 } },
    }
    expect(placeOpening(scene, 'w2', 'door', 900, 'd1')).toEqual({
      ok: false,
      error: 'outsideWall',
    })
  })
})
