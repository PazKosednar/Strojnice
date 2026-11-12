import { describe, expect, it } from 'vitest'
import { createRectangularRoom } from '../core/rectangularRoom'
import { createEmptyScene } from '../core/scene'
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
})
