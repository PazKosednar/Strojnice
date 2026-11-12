import { describe, expect, it } from 'vitest'
import { createRectangularRoom } from './rectangularRoom'
import { createEmptyScene, type Opening, type Scene } from './scene'
import type { SceneResult } from './sceneResult'
import { wallLength } from './wallGeometry'
import {
  addWall,
  addWalls,
  moveWallEndpoint,
  removeWall,
  setWallLength,
  updateWall,
} from './wallOps'

function unwrap(result: SceneResult): Scene {
  if (!result.ok) throw new Error(`expected ok, got ${result.error}`)
  return result.scene
}

function room(): Scene {
  let n = 0
  const scene = createEmptyScene()
  const walls = createRectangularRoom(3200, 1800, scene.settings, () => `w${++n}`)
  return { ...scene, walls }
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

describe('addWall / addWalls', () => {
  it('adds a wall with project defaults and rounded points', () => {
    const scene = unwrap(
      addWall(createEmptyScene(), { start: { x: 0.4, y: 0 }, end: { x: 1500.6, y: 0 } }, 'a'),
    )
    expect(scene.walls).toEqual([
      { id: 'a', start: { x: 0, y: 0 }, end: { x: 1501, y: 0 }, thickness: 200, height: 2600 },
    ])
  })

  it('does not mutate the input scene', () => {
    const before = createEmptyScene()
    addWall(before, { start: { x: 0, y: 0 }, end: { x: 100, y: 0 } }, 'a')
    expect(before.walls).toEqual([])
  })

  it('rejects zero-length walls and invalid sizes', () => {
    const empty = createEmptyScene()
    const p = { x: 10, y: 10 }
    expect(addWall(empty, { start: p, end: p }, 'a')).toEqual({ ok: false, error: 'wallTooShort' })
    expect(addWall(empty, { start: p, end: { x: 50, y: 10 }, thickness: 0 }, 'a')).toEqual({
      ok: false,
      error: 'invalidValue',
    })
  })

  it('adds several walls at once', () => {
    const scene = unwrap(
      addWalls(createEmptyScene(), [
        { id: 'a', start: { x: 0, y: 0 }, end: { x: 100, y: 0 } },
        { id: 'b', start: { x: 100, y: 0 }, end: { x: 100, y: 100 } },
      ]),
    )
    expect(scene.walls.map((w) => w.id)).toEqual(['a', 'b'])
  })
})

describe('moveWallEndpoint', () => {
  it('moves joined endpoints of neighbouring walls too', () => {
    const scene = unwrap(moveWallEndpoint(room(), 'w1', 'end', { x: 3500, y: 0 }))
    expect(scene.walls[0]!.end).toEqual({ x: 3500, y: 0 })
    expect(scene.walls[1]!.start).toEqual({ x: 3500, y: 0 })
    expect(scene.walls[2]!.start).toEqual({ x: 3200, y: 1800 })
  })

  it('rejects a move that collapses a wall', () => {
    expect(moveWallEndpoint(room(), 'w1', 'end', { x: 0, y: 0 })).toEqual({
      ok: false,
      error: 'wallTooShort',
    })
  })

  it('rejects a move that pushes an opening out of its wall', () => {
    const scene = { ...room(), openings: [window1] }
    expect(moveWallEndpoint(scene, 'w1', 'end', { x: 2000, y: 0 })).toEqual({
      ok: false,
      error: 'openingsDoNotFit',
    })
  })

  it('reports an unknown wall', () => {
    expect(moveWallEndpoint(room(), 'nope', 'end', { x: 0, y: 0 }).ok).toBe(false)
  })
})

describe('setWallLength', () => {
  it('moves the end along the wall direction', () => {
    const scene = unwrap(setWallLength(room(), 'w2', 2400))
    expect(wallLength(scene.walls[1]!)).toBe(2400)
    expect(scene.walls[1]!.end).toEqual({ x: 3200, y: 2400 })
    expect(scene.walls[2]!.start).toEqual({ x: 3200, y: 2400 })
  })

  it('rejects non-positive or fractional lengths', () => {
    expect(setWallLength(room(), 'w2', 0)).toEqual({ ok: false, error: 'invalidValue' })
    expect(setWallLength(room(), 'w2', 10.5)).toEqual({ ok: false, error: 'invalidValue' })
  })
})

describe('updateWall', () => {
  it('changes thickness and height', () => {
    const scene = unwrap(updateWall(room(), 'w1', { thickness: 120, height: 2400 }))
    expect(scene.walls[0]).toMatchObject({ thickness: 120, height: 2400 })
  })

  it('rejects a height lower than an existing opening', () => {
    const scene = { ...room(), openings: [window1] }
    expect(updateWall(scene, 'w1', { height: 2000 })).toEqual({
      ok: false,
      error: 'openingsDoNotFit',
    })
  })
})

describe('removeWall', () => {
  it('removes the wall and its openings', () => {
    const other: Opening = { ...window1, id: 'o2', wallId: 'w2', offset: 100, width: 600 }
    const scene = unwrap(removeWall({ ...room(), openings: [window1, other] }, 'w1'))
    expect(scene.walls.map((w) => w.id)).toEqual(['w2', 'w3', 'w4'])
    expect(scene.openings.map((o) => o.id)).toEqual(['o2'])
  })
})
