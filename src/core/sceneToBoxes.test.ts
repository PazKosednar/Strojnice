import { describe, expect, it } from 'vitest'
import { createRectangularRoom } from './rectangularRoom'
import { createEmptyScene, type Opening, type Scene, type Wall } from './scene'
import {
  boxesBounds,
  FLOOR_THICKNESS,
  pointTo3d,
  sceneToBoxes,
  spaceToBoxes,
  wallBaseBoxes,
} from './sceneToBoxes'

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

describe('boxesBounds radius', () => {
  it('is half the diagonal of the bounding box', () => {
    const bounds = boxesBounds([
      {
        key: 'a',
        kind: 'wall',
        elementId: 'a',
        center: [0, 0, 0],
        size: [2, 2, 2],
        rotationY: 0,
        outward: 1,
      },
    ])!
    expect(bounds.radius).toBeCloseTo(Math.sqrt(3))
  })
})

describe('wallBaseBoxes', () => {
  it('cuts the floor-standing wall pieces to the base height', () => {
    const boxes = sceneToBoxes(sceneWith([freeWall], [window1]))
    const base = wallBaseBoxes(boxes, 200)
    // Left, below-sill and right pieces stand on the floor; the lintel does not.
    expect(base.map((b) => +b.size[1].toFixed(3))).toEqual([0.2, 0.2, 0.2])
    expect(base.every((b) => Math.abs(b.center[1] - 0.1) < 1e-9)).toBe(true)
    expect(base.every((b) => b.key.endsWith(':base') && b.elementId === 'w')).toBe(true)
  })

  it('keeps pieces lower than the base height as they are', () => {
    const door = {
      ...window1,
      type: 'door' as const,
      offset: 0,
      width: 900,
      height: 2500,
      sillHeight: 0,
    }
    const base = wallBaseBoxes(sceneToBoxes(sceneWith([freeWall], [door])), 200)
    expect(base).toHaveLength(1)
  })
})

describe('spaceToBoxes', () => {
  it('converts obstacles and zones to metres with the plan y as -z', () => {
    const scene = {
      ...createEmptyScene(),
      obstacles: [
        {
          id: 'o',
          tag: 'OV-01',
          name: 'El. omarica',
          category: 'electrical' as const,
          center: { x: 1000, y: 2000 },
          width: 600,
          depth: 200,
          rotation: 90,
          bottom: 300,
          height: 1200,
        },
      ],
      zones: [
        {
          id: 'z',
          name: 'Pred vrati',
          kind: 'forbidden' as const,
          center: { x: 0, y: 0 },
          width: 900,
          depth: 800,
          rotation: 0,
          bottom: 0,
          height: 2100,
        },
      ],
    }
    const [obstacle, zone] = spaceToBoxes(scene)
    expect(obstacle).toMatchObject({ kind: 'obstacle', label: 'OV-01 El. omarica' })
    expect(obstacle!.center[0]).toBeCloseTo(1)
    expect(obstacle!.center[1]).toBeCloseTo(0.9)
    expect(obstacle!.center[2]).toBeCloseTo(-2)
    expect(obstacle!.size.map((v) => +v.toFixed(3))).toEqual([0.6, 1.2, 0.2])
    expect(obstacle!.rotationY).toBeCloseTo(Math.PI / 2)
    expect(zone).toMatchObject({ kind: 'forbidden', label: 'Pred vrati' })
  })

  it('places a point with height', () => {
    expect(pointTo3d({ x: 1000, y: 500, z: 2000 })).toEqual([1, 2, -0.5])
  })
})

describe('wall boxes: outward side', () => {
  it('tells which local z side faces out of the room, whatever the wall direction', () => {
    let n = 0
    const scene = createEmptyScene()
    const walls = createRectangularRoom(3200, 1800, scene.settings, () => `w${++n}`)
    const out = (ws: Wall[]) =>
      sceneToBoxes({ ...scene, walls: ws })
        .filter((b) => b.kind === 'wall')
        .map((b) => {
          // Local +z in plan coordinates is (sin, -cos) of the rotation.
          const plus = { x: Math.sin(b.rotationY), y: -Math.cos(b.rotationY) }
          return { id: b.elementId, plus, outward: b.outward }
        })
    for (const box of out(walls)) {
      const wall = walls.find((w) => w.id === box.id)!
      const mid = { x: (wall.start.x + wall.end.x) / 2, y: (wall.start.y + wall.end.y) / 2 }
      const towardsOutside = { x: mid.x - 1600, y: mid.y - 900 }
      const side = box.plus.x * towardsOutside.x + box.plus.y * towardsOutside.y > 0 ? 1 : -1
      expect(box.outward).toBe(side)
    }
    // A wall drawn the other way round flips the sign.
    const reversed = walls.map((w, i) => (i === 0 ? { ...w, start: w.end, end: w.start } : w))
    const first = out(walls).find((b) => b.id === walls[0]!.id)!
    const flipped = out(reversed).find((b) => b.id === walls[0]!.id)!
    expect(flipped.outward).toBe(-first.outward)
  })
})
