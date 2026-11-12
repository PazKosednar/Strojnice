import { describe, expect, it } from 'vitest'
import { addEquipment } from '../equipmentOps'
import { addPipe, setPipeRoute } from '../pipeOps'
import type { EquipmentType, Pipe, PipeEnd, Point3, Scene } from '../scene'
import type { SceneResult } from '../sceneResult'
import { addTerminal } from '../terminalOps'
import { roomScene } from '../testFixtures'
import { buildObstacleField } from './obstacles'
import { routePipe, type RouteOutcome } from './routePipe'

function unwrap(result: SceneResult): Scene {
  if (!result.ok) throw new Error(`expected ok, got ${result.error}`)
  return result.scene
}

/** Small box with one supply and one return port on its front (-y), both DN 22. */
const unit: EquipmentType = {
  id: 'unit',
  name: 'Unit',
  tagPrefix: 'U',
  shape: { kind: 'box', width: 400, depth: 300, height: 500 },
  mounting: 'floor',
  ports: [
    {
      id: 'flow',
      name: 'Dvižni',
      systemId: 'supply',
      position: { x: -100, y: -150, z: 250 },
      direction: '-y',
      size: '',
      outerDiameter: 22,
    },
    {
      id: 'ret',
      name: 'Povratni',
      systemId: 'return',
      position: { x: 100, y: -150, z: 250 },
      direction: '-y',
      size: '',
      outerDiameter: 22,
    },
  ],
}

const obstacleType: EquipmentType = {
  id: 'obstacle',
  name: 'Obstacle',
  tagPrefix: 'X',
  shape: { kind: 'cylinder', diameter: 600, height: 2000 },
  mounting: 'floor',
  ports: [],
}

const port = (equipmentId: string, portId: string): PipeEnd => ({
  kind: 'port',
  equipmentId,
  portId,
})

interface Placed {
  id: string
  type?: EquipmentType
  x: number
  y: number
  rotation?: number
  elevation?: number
}

function sceneWith(items: Placed[], grid = 100): Scene {
  let scene = roomScene()
  scene = { ...scene, settings: { ...scene.settings, routingGrid: grid } }
  for (const item of items) {
    scene = unwrap(
      addEquipment(scene, {
        id: item.id,
        type: item.type ?? unit,
        position: { x: item.x, y: item.y },
        rotation: item.rotation ?? 0,
        elevation: item.elevation ?? 0,
      }),
    )
  }
  return scene
}

function connect(scene: Scene, id: string, from: PipeEnd, to: PipeEnd): [Scene, Pipe] {
  const next = unwrap(addPipe(scene, { id, from, to }))
  return [next, next.pipes.find((p) => p.id === id)!]
}

function expectOk(outcome: RouteOutcome) {
  if (!outcome.ok) throw new Error(`routing failed: ${outcome.reason}`)
  return outcome
}

function isOrthogonal(route: readonly Point3[]) {
  return route.every((p, i) => {
    const q = route[i - 1]
    if (!q) return true
    return Number(p.x !== q.x) + Number(p.y !== q.y) + Number(p.z !== q.z) === 1
  })
}

/** Points every 10 mm along the route (for collision checks). */
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

describe('routePipe', () => {
  // Two units facing the room from the top wall (rotation 180: front towards -y... see below).
  // Rotation 0 -> front (ports) towards plan -y.
  it('connects two ports with an axis-parallel route that starts and ends exactly at them', () => {
    const [scene, pipe] = connect(
      sceneWith([
        { id: 'a', x: 700, y: 1300 },
        { id: 'b', x: 2500, y: 1300 },
      ]),
      'p',
      port('a', 'ret'),
      port('b', 'ret'),
    )
    const result = expectOk(routePipe(scene, pipe))
    expect(result.route[0]).toEqual({ x: 800, y: 1150, z: 250 })
    expect(result.route[result.route.length - 1]).toEqual({ x: 2600, y: 1150, z: 250 })
    // Straight run out of each port (at least portStraight = 100 mm) before the first bend.
    const first = result.route[1]!
    expect([first.x, first.z]).toEqual([800, 250])
    expect(first.y).toBeLessThanOrEqual(1050)
    const last = result.route[result.route.length - 2]!
    expect([last.x, last.z]).toEqual([2600, 250])
    expect(last.y).toBeLessThanOrEqual(1050)
    expect(isOrthogonal(result.route)).toBe(true)
    expect(result.crossings).toEqual([])
    expect(result.length).toBeGreaterThanOrEqual(1800 + 200)
    expect(result.gridStep).toBe(100)
  })

  it('goes around equipment in the way, keeping pipe radius and spacing', () => {
    const [scene, pipe] = connect(
      sceneWith([
        { id: 'a', x: 500, y: 1300 },
        { id: 'b', x: 2700, y: 1300 },
        { id: 'x', type: obstacleType, x: 1650, y: 1000 },
      ]),
      'p',
      port('a', 'ret'),
      port('b', 'ret'),
    )
    const result = expectOk(routePipe(scene, pipe))
    const field = buildObstacleField(scene, {
      pipeRadius: 11,
      spacing: 0,
      ownEquipmentIds: ['a', 'b'],
      ignorePipeIds: ['p'],
      ownEnds: [pipe.from, pipe.to],
    })
    // The first and last points lie on the equipment surface (the ports): check the rest.
    expect(samples(result.route.slice(1, -1)).some((p) => field.blocked(p))).toBe(false)
  })

  it('prefers running along a wall', () => {
    // Both units stand against the bottom wall, ports facing up into the room.
    const [scene, pipe] = connect(
      sceneWith([
        { id: 'a', x: 500, y: 250, rotation: 180 },
        { id: 'b', x: 2700, y: 250, rotation: 180 },
      ]),
      'p',
      port('a', 'ret'),
      port('b', 'ret'),
    )
    const result = expectOk(routePipe(scene, pipe))
    // The long horizontal run stays within 600 mm of the bottom wall face (y = 100).
    const ys = result.route.map((p) => p.y)
    expect(Math.max(...ys)).toBeLessThanOrEqual(700)
  })

  it('crosses a wall to reach equipment outside the room and reports the penetration', () => {
    const [scene, pipe] = connect(
      sceneWith([
        { id: 'out', x: -900, y: 900, rotation: 270 }, // outside the left wall, front towards +x
        { id: 'in', x: 1600, y: 1300 },
      ]),
      'p',
      port('out', 'flow'),
      port('in', 'flow'),
    )
    const result = expectOk(routePipe(scene, pipe))
    expect(result.crossings.map((c) => c.wallId)).toEqual(['w4'])
    expect(isOrthogonal(result.route)).toBe(true)
  })

  it('does not pass through a door opening', () => {
    let scene = sceneWith([
      { id: 'out', x: 4100, y: 900, rotation: 90 }, // outside the right wall, front towards -x
      { id: 'in', x: 1600, y: 1300 },
    ])
    scene = {
      ...scene,
      openings: [
        {
          id: 'door',
          wallId: 'w2',
          type: 'door',
          offset: 0,
          width: 1800,
          height: 2100,
          sillHeight: 0,
        },
      ],
    }
    const [withPipe, pipe] = connect(scene, 'p', port('out', 'flow'), port('in', 'flow'))
    const result = expectOk(routePipe(withPipe, pipe))
    // The whole right wall is a door up to 2100 mm: nothing may pass through that opening.
    const inDoor = samples(result.route).filter(
      (p) => p.x > 3100 && p.x < 3300 && p.y > 0 && p.y < 1800 && p.z < 2100,
    )
    expect(inDoor).toEqual([])
    expect(result.crossings).toHaveLength(1)
  })

  it('reports a blocked port', () => {
    // Obstacle right in front of the ports of "a".
    const [scene, pipe] = connect(
      sceneWith([
        { id: 'a', x: 1000, y: 1300 },
        { id: 'b', x: 2500, y: 1300 },
        { id: 'x', type: obstacleType, x: 1000, y: 850 },
      ]),
      'p',
      port('a', 'ret'),
      port('b', 'ret'),
    )
    expect(routePipe(scene, pipe)).toEqual({ ok: false, reason: 'startBlocked' })
  })

  it('avoids pipes that are already routed', () => {
    const units = sceneWith([
      { id: 'a', x: 700, y: 1300 },
      { id: 'b', x: 2500, y: 1300 },
    ])
    const [withFirst, first] = connect(units, 'p1', port('a', 'ret'), port('b', 'ret'))
    const routed = unwrap(
      setPipeRoute(withFirst, 'p1', { route: expectOk(routePipe(withFirst, first)).route }),
    )
    const [scene, second] = connect(routed, 'p2', port('a', 'flow'), port('b', 'flow'))
    const result = expectOk(routePipe(scene, second))
    const field = buildObstacleField(scene, {
      pipeRadius: 11,
      spacing: scene.settings.pipeSpacing,
      ownEquipmentIds: ['a', 'b'],
      ignorePipeIds: ['p2'],
      ownEnds: [second.from, second.to],
    })
    const clash = samples(result.route.slice(1, -1)).filter((p) => field.blocked(p))
    expect(clash).toEqual([])
  })

  it('starts a terminal route on the wall axis and leaves the wall perpendicular', () => {
    let scene = sceneWith([{ id: 'a', x: 1000, y: 1300 }])
    scene = unwrap(
      addTerminal(scene, {
        id: 't',
        wallId: 'w2',
        offset: 900,
        height: 300,
        systemId: 'return',
        outerDiameter: 22,
      }),
    )
    const [withPipe, pipe] = connect(scene, 'p', port('a', 'ret'), {
      kind: 'terminal',
      terminalId: 't',
    })
    const result = expectOk(routePipe(withPipe, pipe))
    const last = result.route[result.route.length - 1]!
    const beforeLast = result.route[result.route.length - 2]!
    expect(last).toEqual({ x: 3200, y: 900, z: 300 })
    expect(beforeLast.y).toBe(900)
    expect(beforeLast.z).toBe(300)
    expect(beforeLast.x).toBeLessThanOrEqual(3200 - 100 - 100)
    expect(result.crossings.map((c) => c.wallId)).toEqual(['w2'])
  })

  it('stops when the time budget runs out', () => {
    const [scene, pipe] = connect(
      sceneWith([
        { id: 'a', x: 700, y: 1300 },
        { id: 'b', x: 2500, y: 1300 },
      ]),
      'p',
      port('a', 'ret'),
      port('b', 'ret'),
    )
    let t = 0
    const result = routePipe(scene, pipe, {
      now: () => (t += 1000),
      limits: { timeBudgetMs: 500, clockEvery: 1 },
    })
    expect(result).toMatchObject({ ok: false, reason: 'timeout' })
  })

  it('coarsens the grid for large scenes and gives up when even that is too large', () => {
    const [scene, pipe] = connect(
      sceneWith(
        [
          { id: 'a', x: 700, y: 1300 },
          { id: 'b', x: 2500, y: 1300 },
        ],
        50,
      ),
      'p',
      port('a', 'ret'),
      port('b', 'ret'),
    )
    const coarse = expectOk(routePipe(scene, pipe, { limits: { maxNodes: 120_000 } }))
    expect(coarse.gridStep).toBe(100)
    expect(routePipe(scene, pipe, { limits: { maxNodes: 1000 } })).toEqual({
      ok: false,
      reason: 'tooLarge',
    })
  })
})
