import { describe, expect, it } from 'vitest'
import { createRectangularRoom } from './rectangularRoom'
import { createEmptyScene, type Opening, type Scene, type Wall } from './scene'
import { boxesBounds, FLOOR_THICKNESS, sceneToBoxes } from './sceneToBoxes'

const freeWall: Wall = {
  id: 'w',
  start: { x: 0, y: 0 },
  end: { x: 3000, y: 0 },
  thickness: 200,
  height: 2600,
}

const sceneWith = (walls: Wall[], openings: Opening[] = []): Scene => ({
  ...createEmptyScene(),
  walls,
  openings,
})

const window1: Opening = {
  id: 'o1',
  wallId: 'w',
  type: 'window',
  offset: 1000,
  width: 1200,
  height: 1200,
  sillHeight: 900,
}

const walls = (scene: Scene) => sceneToBoxes(scene).filter((b) => b.kind === 'wall')

describe('sceneToBoxes', () => {
  it('returns nothing for an empty scene', () => {
    expect(sceneToBoxes(createEmptyScene())).toEqual([])
  })

  it('converts a solid wall to one box in metres (plan y -> world -z)', () => {
    const [box] = walls(
      sceneWith([{ ...freeWall, start: { x: 0, y: 1000 }, end: { x: 3000, y: 1000 } }]),
    )
    expect(box).toMatchObject({ elementId: 'w', rotationY: 0 })
    expect(box!.center[0]).toBeCloseTo(1.5)
    expect(box!.center[1]).toBeCloseTo(1.3)
    expect(box!.center[2]).toBeCloseTo(-1)
    expect(box!.size).toEqual([3, 2.6, 0.2])
  })

  it('rotates boxes by the wall angle', () => {
    const [box] = walls(sceneWith([{ ...freeWall, end: { x: 0, y: 2000 } }]))
    expect(box!.rotationY).toBeCloseTo(Math.PI / 2)
    expect(box!.center[2]).toBeCloseTo(-1)
  })

  it('cuts a window: left, below-sill, above-lintel and right pieces', () => {
    const boxes = walls(sceneWith([freeWall], [window1]))
    const sizes = boxes.map((b) => b.size.map((v) => +v.toFixed(3)))
    expect(sizes).toEqual([
      [1, 2.6, 0.2], // 0..1000 full height
      [1.2, 0.9, 0.2], // below the sill
      [1.2, 0.5, 0.2], // above: 2100..2600
      [0.8, 2.6, 0.2], // 2200..3000
    ])
    expect(boxes[1]!.center[1]).toBeCloseTo(0.45)
    expect(boxes[2]!.center[1]).toBeCloseTo(2.35)
  })

  it('cuts a door without a below-sill piece', () => {
    const door: Opening = {
      ...window1,
      type: 'door',
      offset: 0,
      width: 900,
      height: 2100,
      sillHeight: 0,
    }
    const sizes = walls(sceneWith([freeWall], [door])).map((b) => b.size.map((v) => +v.toFixed(3)))
    expect(sizes).toEqual([
      [0.9, 0.5, 0.2],
      [2.1, 2.6, 0.2],
    ])
  })

  it('omits the lintel when the opening reaches the wall top', () => {
    const tall = { ...window1, sillHeight: 0, height: 2600, type: 'door' as const }
    expect(walls(sceneWith([freeWall], [tall]))).toHaveLength(2)
  })

  it('extends joined walls by half the thickness to close corners', () => {
    let n = 0
    const scene = sceneWith(
      createRectangularRoom(3200, 1800, createEmptyScene().settings, () => `w${++n}`),
    )
    const first = walls(scene)[0]!
    expect(first.size[0]).toBeCloseTo(3.4)
    expect(first.center[0]).toBeCloseTo(1.6)
  })

  it('adds a floor under the walls with its top at height 0', () => {
    const floor = sceneToBoxes(sceneWith([freeWall])).find((b) => b.kind === 'floor')!
    expect(floor.size[0]).toBeCloseTo(3)
    expect(floor.size[2]).toBeCloseTo(0.2)
    expect(floor.center[1] + floor.size[1] / 2).toBeCloseTo(0)
    expect(floor.size[1]).toBe(FLOOR_THICKNESS)
  })
})

describe('boxesBounds', () => {
  it('returns null without boxes', () => {
    expect(boxesBounds([])).toBeNull()
  })

  it('covers all boxes', () => {
    const bounds = boxesBounds(sceneToBoxes(sceneWith([freeWall])))!
    expect(bounds.center[0]).toBeCloseTo(1.5)
    expect(bounds.radius).toBeGreaterThanOrEqual(1.5)
  })
})
