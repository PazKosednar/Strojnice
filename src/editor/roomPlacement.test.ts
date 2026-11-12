import { describe, expect, it } from 'vitest'
import { createRectangularRoom } from '../core/rectangularRoom'
import { createEmptyScene } from '../core/scene'
import { newRoomOrigin } from './roomPlacement'

describe('newRoomOrigin', () => {
  it('uses the origin for an empty scene', () => {
    expect(newRoomOrigin(createEmptyScene())).toEqual({ x: 0, y: 0 })
  })

  it('places the room to the right of existing walls, on the grid', () => {
    let n = 0
    const scene = createEmptyScene()
    const walls = createRectangularRoom(3210, 1800, scene.settings, () => `w${++n}`)
    expect(newRoomOrigin({ ...scene, walls })).toEqual({ x: 4250, y: 0 })
  })
})
