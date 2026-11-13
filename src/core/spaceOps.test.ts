import { describe, expect, it } from 'vitest'
import { addEquipment } from './equipmentOps'
import { addObstacle, removeObstacle, updateObstacle } from './obstacleOps'
import { parseScene } from './parseScene'
import { planBoxCorners, planBoxFromCorners } from './planBox'
import { createEmptyScene, type Obstacle, type Scene, type Zone } from './scene'
import type { SceneResult } from './sceneResult'
import { boxType } from './testFixtures'
import { addZone, removeZone, updateZone } from './zoneOps'

function unwrap(result: SceneResult): Scene {
  if (!result.ok) throw new Error(result.error)
  return result.scene
}

const cabinet: Omit<Obstacle, 'tag'> = {
  id: 'o1',
  name: 'El. omarica',
  category: 'electrical',
  center: { x: 1000, y: 1700 },
  width: 600,
  depth: 200,
  rotation: 0,
  bottom: 300,
  height: 1200,
}

const zone: Zone = {
  id: 'z1',
  name: 'Pred vrati',
  kind: 'forbidden',
  center: { x: 500, y: 400 },
  width: 900,
  depth: 800,
  rotation: 0,
  bottom: 0,
  height: 2100,
}

describe('planBox', () => {
  it('builds an axis-aligned box from two drawn corners', () => {
    expect(planBoxFromCorners({ x: 200, y: 900 }, { x: -100, y: 100 }, 0, 2600)).toEqual({
      center: { x: 50, y: 500 },
      width: 300,
      depth: 800,
      rotation: 0,
      bottom: 0,
      height: 2600,
    })
  })

  it('returns the rotated corners', () => {
    const corners = planBoxCorners({ ...cabinet, rotation: 90 })
    expect(corners.map((p) => ({ x: Math.round(p.x), y: Math.round(p.y) }))).toEqual([
      { x: 1100, y: 1400 },
      { x: 1100, y: 2000 },
      { x: 900, y: 2000 },
      { x: 900, y: 1400 },
    ])
  })
})

describe('obstacleOps', () => {
  it('adds an obstacle with the next OV tag, unique together with equipment tags', () => {
    let scene = unwrap(
      addEquipment(createEmptyScene(), {
        id: 'e1',
        type: boxType,
        position: { x: 0, y: 0 },
        tag: 'OV-01',
      }),
    )
    scene = unwrap(addObstacle(scene, cabinet))
    expect(scene.obstacles[0]).toEqual({ ...cabinet, tag: 'OV-02' })
    expect(addObstacle(scene, { ...cabinet, id: 'o2', tag: 'OV-01' })).toEqual({
      ok: false,
      error: 'tagTaken',
    })
  })

  it('keeps tags exactly as entered and rejects empty ones', () => {
    const scene = unwrap(addObstacle(createEmptyScene(), { ...cabinet, tag: 'el-Omara 3' }))
    expect(scene.obstacles[0]!.tag).toBe('el-Omara 3')
    expect(updateObstacle(scene, 'o1', { tag: ' ' })).toEqual({ ok: false, error: 'tagEmpty' })
  })

  it('rejects invalid sizes, heights and rotations; rounds drawn values', () => {
    const scene = createEmptyScene()
    for (const bad of [{ width: 0 }, { height: -5 }, { bottom: -1 }]) {
      expect(addObstacle(scene, { ...cabinet, ...bad })).toEqual({
        ok: false,
        error: 'invalidBox',
      })
    }
    const added = unwrap(addObstacle(scene, { ...cabinet, width: 600.4, rotation: 370 }))
    expect(added.obstacles[0]).toMatchObject({ width: 600, rotation: 10 })
  })

  it('updates and removes', () => {
    let scene = unwrap(addObstacle(createEmptyScene(), cabinet))
    scene = unwrap(updateObstacle(scene, 'o1', { bottom: 0, category: 'duct' }))
    expect(scene.obstacles[0]).toMatchObject({ bottom: 0, category: 'duct' })
    expect(unwrap(removeObstacle(scene, 'o1')).obstacles).toEqual([])
    expect(removeObstacle(scene, 'x')).toEqual({ ok: false, error: 'notFound' })
  })
})

describe('zoneOps', () => {
  it('adds, updates and removes zones', () => {
    let scene = unwrap(addZone(createEmptyScene(), zone))
    scene = unwrap(updateZone(scene, 'z1', { kind: 'preferred', bottom: 2200, height: 300 }))
    expect(scene.zones[0]).toMatchObject({ kind: 'preferred', bottom: 2200, height: 300 })
    expect(updateZone(scene, 'z1', { depth: 0 })).toEqual({ ok: false, error: 'invalidBox' })
    expect(unwrap(removeZone(scene, 'z1')).zones).toEqual([])
  })
})

describe('parseScene with obstacles, zones and rules', () => {
  const withAll = (): Scene => {
    let scene = unwrap(addObstacle(createEmptyScene(), cabinet))
    scene = unwrap(addZone(scene, zone))
    return {
      ...scene,
      rules: [
        {
          id: 'r1',
          active: true,
          source: 'test',
          hard: true,
          kind: 'obstacleDistance',
          systemId: 'cold',
          category: 'electrical',
          distance: null,
        },
        {
          id: 'r2',
          active: false,
          source: '',
          hard: false,
          kind: 'heightRange',
          systemId: null,
          min: 2000,
          max: null,
        },
      ],
    }
  }

  it('reads them back unchanged', () => {
    const scene = withAll()
    expect(parseScene(JSON.parse(JSON.stringify(scene)))).toEqual({ ok: true, scene })
  })

  it('rejects an obstacle tag used by equipment, bad categories and an upside-down range', () => {
    const scene = withAll()
    const tagClash = {
      ...scene,
      terminals: [],
      equipment: [
        {
          id: 'e1',
          tag: 'OV-01',
          type: boxType,
          position: { x: 0, y: 0 },
          elevation: 0,
          rotation: 0,
        },
      ],
    }
    expect(parseScene(tagClash)).toMatchObject({ ok: false })
    expect(
      parseScene({ ...scene, obstacles: [{ ...scene.obstacles[0], category: 'gas' }] }),
    ).toMatchObject({ ok: false })
    expect(
      parseScene({ ...scene, rules: [{ ...scene.rules[1], min: 3000, max: 1000 }] }),
    ).toMatchObject({ ok: false })
  })

  it('keeps a rule that names an unknown system (it simply has no effect)', () => {
    const scene = withAll()
    const result = parseScene({ ...scene, rules: [{ ...scene.rules[0], systemId: 'gone' }] })
    expect(result.ok).toBe(true)
  })
})
