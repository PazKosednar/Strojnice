import { describe, expect, it } from 'vitest'
import { addEquipment } from '../equipmentOps'
import { addObstacle } from '../obstacleOps'
import { addPipe, setPipeRoute } from '../pipeOps'
import { checkRules } from '../rules/checkRules'
import type { EquipmentType, Pipe, PipeEnd, Point3, RoutingRule, Scene, Zone } from '../scene'
import type { SceneResult } from '../sceneResult'
import { roomScene } from '../testFixtures'
import { addZone } from '../zoneOps'
import { routePipe, type RouteOutcome } from './routePipe'

function unwrap(result: SceneResult): Scene {
  if (!result.ok) throw new Error(result.error)
  return result.scene
}

function expectOk(outcome: RouteOutcome) {
  if (!outcome.ok) throw new Error(`routing failed: ${outcome.reason}`)
  return outcome
}

/** Box with a cold-water port on its front (-y), 400 mm up, DN 22. */
const unit: EquipmentType = {
  id: 'unit',
  name: 'Unit',
  tagPrefix: 'U',
  shape: { kind: 'box', width: 400, depth: 300, height: 500 },
  mounting: 'floor',
  ports: [
    {
      id: 'c',
      name: 'Hladna',
      systemId: 'cold',
      position: { x: 0, y: -150, z: 400 },
      direction: '-y',
      size: '',
      outerDiameter: 22,
    },
    {
      id: 's',
      name: 'Dvižni',
      systemId: 'supply',
      position: { x: 150, y: -150, z: 400 },
      direction: '-y',
      size: '',
      outerDiameter: 22,
    },
  ],
}

const port = (equipmentId: string, portId: string): PipeEnd => ({
  kind: 'port',
  equipmentId,
  portId,
})

/** Two units facing each other across the room (ports towards the middle). */
function twoUnits(): Scene {
  let scene = { ...roomScene(), settings: { ...roomScene().settings, routingGrid: 50 } }
  scene = unwrap(addEquipment(scene, { id: 'a', type: unit, position: { x: 600, y: 1300 } }))
  scene = unwrap(
    addEquipment(scene, { id: 'b', type: unit, position: { x: 2600, y: 1300 }, rotation: 0 }),
  )
  return scene
}

function connect(scene: Scene, from: PipeEnd, to: PipeEnd, id = 'p'): [Scene, Pipe] {
  const next = unwrap(addPipe(scene, { id, from, to }))
  return [next, next.pipes.find((p) => p.id === id)!]
}

function samples(route: readonly Point3[]): Point3[] {
  const out: Point3[] = []
  route.forEach((p, i) => {
    const q = route[i + 1]
    if (!q) return
    const n = Math.max(
      1,
      Math.ceil((Math.abs(q.x - p.x) + Math.abs(q.y - p.y) + Math.abs(q.z - p.z)) / 10),
    )
    for (let k = 0; k <= n; k++) {
      out.push({
        x: p.x + ((q.x - p.x) * k) / n,
        y: p.y + ((q.y - p.y) * k) / n,
        z: p.z + ((q.z - p.z) * k) / n,
      })
    }
  })
  return out
}

const zone = (patch: Partial<Zone>): Zone => ({
  id: 'z',
  name: 'Cona',
  kind: 'forbidden',
  center: { x: 1600, y: 1000 },
  width: 600,
  depth: 600,
  rotation: 0,
  bottom: 0,
  height: 2600,
  ...patch,
})

const inside = (p: Point3, z: Zone) =>
  Math.abs(p.x - z.center.x) < z.width / 2 &&
  Math.abs(p.y - z.center.y) < z.depth / 2 &&
  p.z > z.bottom &&
  p.z < z.bottom + z.height

describe('routing with obstacles, zones and rules', () => {
  it('keeps out of obstacles (with spacing) and forbidden zones', () => {
    const [plain, pipe] = connect(twoUnits(), port('a', 'c'), port('b', 'c'))
    const straight = expectOk(routePipe(plain, pipe)).route
    // Without anything in the way the pipe runs through the middle of the room.
    const forbidden = zone({})
    expect(samples(straight).some((p) => inside(p, forbidden))).toBe(true)

    const withZone = unwrap(addZone(plain, forbidden))
    const around = expectOk(routePipe(withZone, pipe)).route
    expect(samples(around).filter((p) => inside(p, forbidden))).toEqual([])

    const withObstacle = unwrap(
      addObstacle(plain, { ...forbidden, id: 'o', name: 'Steber', category: 'structure' }),
    )
    const result = expectOk(routePipe(withObstacle, pipe)).route
    const keep = 11 + plain.settings.pipeSpacing
    const grown = { ...forbidden, width: 600 + 2 * keep - 2, depth: 600 + 2 * keep - 2 }
    expect(samples(result).filter((p) => inside(p, grown))).toEqual([])
  })

  it('prefers a preferred zone and avoids an avoid zone', () => {
    const [plain, pipe] = connect(twoUnits(), port('a', 'c'), port('b', 'c'))
    // A corridor beside the direct line: a detour, but cheap. The factor is set for the
    // test (the mechanism is tested, not the starting value).
    const corridor = zone({
      kind: 'preferred',
      center: { x: 1600, y: 700 },
      width: 1600,
      depth: 200,
      bottom: 300,
      height: 200,
    })
    const straightLine = expectOk(routePipe(plain, pipe)).route
    expect(samples(straightLine).some((p) => inside(p, corridor))).toBe(false)
    const viaCorridor = expectOk(
      routePipe(unwrap(addZone(plain, corridor)), pipe, { costs: { preferredZoneFactor: 0.2 } }),
    ).route
    expect(samples(viaCorridor).some((p) => inside(p, corridor))).toBe(true)

    const avoid = zone({ kind: 'avoid', width: 3200, depth: 300, center: { x: 1600, y: 1000 } })
    const straight = expectOk(routePipe(plain, pipe)).route
    const inAvoid = (route: Point3[]) => samples(route).filter((p) => inside(p, avoid)).length
    const avoided = expectOk(routePipe(unwrap(addZone(plain, avoid)), pipe)).route
    expect(inAvoid(avoided)).toBeLessThan(inAvoid(straight))
  })

  it('obeys a hard height range on horizontal runs (and the check agrees)', () => {
    const rule: RoutingRule = {
      id: 'r',
      active: true,
      source: 'test',
      hard: true,
      kind: 'heightRange',
      systemId: 'cold',
      min: 2000,
      max: 2300,
    }
    const [scene, pipe] = connect({ ...twoUnits(), rules: [rule] }, port('a', 'c'), port('b', 'c'))
    const route = expectOk(routePipe(scene, pipe)).route
    const routed = unwrap(setPipeRoute(scene, pipe.id, { route }))
    expect(checkRules(routed)).toEqual([])
    // A rule without a source has no effect: the pipe stays low.
    const noSource = { ...scene, rules: [{ ...rule, source: '' }] }
    const low = expectOk(routePipe(noSource, pipe)).route
    expect(Math.max(...low.map((p) => p.z))).toBeLessThan(2000)
  })

  it('keeps the insulated diameter apart from other pipes', () => {
    const insulated = (scene: Scene, mm: number): Scene => ({
      ...scene,
      settings: {
        ...scene.settings,
        systems: scene.settings.systems.map((s) => ({ ...s, insulationThickness: mm })),
      },
    })
    const rule: RoutingRule = {
      id: 'r',
      active: true,
      source: 'test',
      hard: true,
      kind: 'minSpacing',
      systemA: null,
      systemB: null,
      distance: 40,
    }
    for (const mm of [0, 30]) {
      const [connected, first] = connect(
        { ...insulated(twoUnits(), mm), rules: [rule] },
        port('a', 'c'),
        port('b', 'c'),
        'p1',
      )
      const scene = unwrap(
        setPipeRoute(connected, 'p1', { route: expectOk(routePipe(connected, first)).route }),
      )
      const [withSecond, second] = connect(scene, port('a', 's'), port('b', 's'), 'p2')
      const route = expectOk(routePipe(withSecond, second)).route
      const done = unwrap(setPipeRoute(withSecond, 'p2', { route }))
      expect(checkRules(done)).toEqual([])
    }
  })

  it('does not cross walls under a hard noCrossing rule', () => {
    let scene = twoUnits()
    scene = unwrap(addEquipment(scene, { id: 'out', type: unit, position: { x: 1600, y: -900 } }))
    const [withPipe, pipe] = connect(scene, port('a', 'c'), port('out', 'c'))
    expectOk(routePipe(withPipe, pipe))
    const rule: RoutingRule = {
      id: 'r',
      active: true,
      source: 'test',
      hard: true,
      kind: 'noCrossing',
      systemId: 'cold',
      element: 'wall',
    }
    expect(routePipe({ ...withPipe, rules: [rule] }, pipe)).toMatchObject({ ok: false })
  })

  it('routes two ports closer together than the pipe spacing (manufacturer positions)', () => {
    // Like the Vitocal 250-A outdoor unit: two DN 28 connections 75 mm apart, facing back.
    const odu: EquipmentType = {
      ...unit,
      id: 'odu',
      ports: [
        {
          ...unit.ports[0]!,
          id: 'A',
          systemId: 'supply',
          position: { x: -37, y: 150, z: 400 },
          direction: '+y',
          outerDiameter: 28,
        },
        {
          ...unit.ports[0]!,
          id: 'B',
          systemId: 'return',
          position: { x: 38, y: 150, z: 400 },
          direction: '+y',
          outerDiameter: 28,
        },
      ],
    }
    const idu: EquipmentType = {
      ...unit,
      id: 'idu',
      ports: [
        {
          ...unit.ports[0]!,
          id: 'C',
          systemId: 'supply',
          position: { x: -100, y: -150, z: 400 },
          outerDiameter: 28,
        },
        {
          ...unit.ports[0]!,
          id: 'D',
          systemId: 'return',
          position: { x: 100, y: -150, z: 400 },
          outerDiameter: 28,
        },
      ],
    }
    let scene = { ...roomScene(), settings: { ...roomScene().settings, routingGrid: 50 } }
    scene = unwrap(addEquipment(scene, { id: 'o', type: odu, position: { x: 800, y: 600 } }))
    scene = unwrap(addEquipment(scene, { id: 'i', type: idu, position: { x: 2400, y: 1500 } }))
    expect(scene.settings.pipeSpacing).toBeGreaterThan(75 - 28)
    const [s0, flow] = connect(scene, port('o', 'A'), port('i', 'C'), 'f')
    const s1 = unwrap(setPipeRoute(s0, 'f', { route: expectOk(routePipe(s0, flow)).route }))
    const [s2, ret] = connect(s1, port('i', 'D'), port('o', 'B'), 'r')
    expectOk(routePipe(s2, ret))
  })
})
