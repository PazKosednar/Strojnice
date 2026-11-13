import { describe, expect, it } from 'vitest'
import { createRectangularRoom } from '../core/rectangularRoom'
import { createEmptyScene } from '../core/scene'
import { cylinderType, equipment } from '../core/testFixtures'
import { sceneBounds } from './sceneBounds'

describe('sceneBounds', () => {
  it('is null for an empty scene', () => {
    expect(sceneBounds(createEmptyScene())).toBeNull()
  })

  it('includes wall thickness around the axes', () => {
    let n = 0
    const scene = createEmptyScene()
    const walls = createRectangularRoom(3200, 1800, scene.settings, () => `w${++n}`)
    expect(sceneBounds({ ...scene, walls })).toEqual({
      minX: -100,
      minY: -100,
      maxX: 3300,
      maxY: 1900,
    })
  })

  it('includes equipment outside the room', () => {
    let n = 0
    const scene = createEmptyScene()
    const walls = createRectangularRoom(3200, 1800, scene.settings, () => `w${++n}`)
    const outdoor = equipment({ type: cylinderType, position: { x: -1000, y: 900 } })
    expect(sceneBounds({ ...scene, walls, equipment: [outdoor] })?.minX).toBe(-1300)
  })

  it('works for equipment without walls', () => {
    const scene = { ...createEmptyScene(), equipment: [equipment({ position: { x: 0, y: 0 } })] }
    expect(sceneBounds(scene)).toEqual({ minX: -300, minY: -200, maxX: 300, maxY: 200 })
  })
})
