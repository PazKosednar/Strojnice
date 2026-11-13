import { describe, expect, it } from 'vitest'
import { addEquipment } from '../equipmentOps'
import { addObstacle } from '../obstacleOps'
import { addPipe } from '../pipeOps'
import type { EquipmentType, PipeEnd, Point3, Port, RoutingRule, Scene } from '../scene'
import type { SceneResult } from '../sceneResult'
import { roomScene } from '../testFixtures'
import { routeAll, routeOrder } from './routeAll'

function unwrap(result: SceneResult): Scene {
  if (!result.ok) throw new Error(result.error)
  return result.scene
}

const port = (equipmentId: string, portId: string): PipeEnd => ({
  kind: 'port',
  equipmentId,
  portId,
})
const LIMITS = { limits: { timeBudgetMs: 30_000, batchBudgetMs: 120_000 } }

const p = (id: string, systemId: string, x: number, outerDiameter: number): Port => ({
  id,
  name: id,
  systemId,
  position: { x, y: -150, z: 300 },
  direction: '-y',
  size: '',
  outerDiameter,
})

/** Unit with flow, return and cold water on its front. */
const unit: EquipmentType = {
  id: 'unit',
  name: 'Unit',
  tagPrefix: 'U',
  shape: { kind: 'box', width: 400, depth: 300, height: 500 },
  mounting: 'floor',
  ports: [p('s', 'supply', -100, 28), p('r', 'return', 0, 28), p('c', 'cold', 100, 22)],
}

/** Two units facing each other across the room (left one turned to +x, right one to -x). */
function facing(): Scene {
  let scene = roomScene()
  scene = unwrap(
    addEquipment(scene, { id: 'L', type: unit, position: { x: 500, y: 900 }, rotation: 90 }),
  )
  scene = unwrap(
    addEquipment(scene, { id: 'R', type: unit, position: { x: 2700, y: 900 }, rotation: 270 }),
  )
  return scene
}

function withPipes(scene: Scene, pairs: [string, PipeEnd, PipeEnd][]): Scene {
  return pairs.reduce((s, [id, from, to]) => unwrap(addPipe(s, { id, from, to })), scene)
}

describe('routeOrder', () => {
  it('routes the largest circuit first, pairs together, deterministically', () => {
    let scene = facing()
    scene = unwrap(addEquipment(scene, { id: 'X', type: unit, position: { x: 1600, y: 300 } }))
    scene = withPipes(scene, [
      ['cold', port('L', 'c'), port('X', 'c')],
      ['ret', port('R', 'r'), port('L', 'r')],
      ['flow', port('L', 's'), port('R', 's')],
    ])
    expect(routeOrder(scene, ['cold', 'ret', 'flow'])).toEqual(['flow', 'ret', 'cold'])
    expect(routeOrder(scene, ['flow', 'cold', 'ret'])).toEqual(['flow', 'ret', 'cold'])
  })
})

describe('routeAll', () => {
  it('routes all pipes, the same way every time', () => {
    const scene = withPipes(facing(), [
      ['flow', port('L', 's'), port('R', 's')],
      ['ret', port('R', 'r'), port('L', 'r')],
      ['cold', port('L', 'c'), port('R', 'c')],
    ])
    const first = routeAll(scene, ['flow', 'ret', 'cold'], LIMITS)
    expect(first.results.map((r) => [r.pipeId, r.outcome.ok])).toEqual([
      ['flow', true],
      ['ret', true],
      ['cold', true],
    ])
    const again = routeAll(scene, ['cold', 'flow', 'ret'], LIMITS)
    expect(again.scene.pipes).toEqual(first.scene.pipes)
  })

  it('runs the return alongside the flow at the spacing (one corridor)', () => {
    const scene = withPipes(facing(), [
      ['flow', port('L', 's'), port('R', 's')],
      ['ret', port('R', 'r'), port('L', 'r')],
    ])
    const { scene: done } = routeAll(scene, ['flow', 'ret'], LIMITS)
    const flow = done.pipes.find((x) => x.id === 'flow')!.route
    const ret = done.pipes.find((x) => x.id === 'ret')!.route
    const distance = 14 + 14 + scene.settings.pipeSpacing
    const step = scene.settings.routingGrid
    // Horizontal length of the return that runs next to a flow segment at that distance.
    const along = (a: Point3, b: Point3) => {
      const axis = a.x !== b.x ? 'x' : 'y'
      if (a.z !== b.z || a[axis] === b[axis]) return 0
      let total = 0
      flow.slice(1).forEach((q, i) => {
        const f = flow[i]!
        if (f.z !== q.z || (axis === 'x' ? f.x === q.x : f.y === q.y)) return
        const other = axis === 'x' ? 'y' : 'x'
        const apart = Math.hypot(a[other] - f[other], a.z - f.z)
        if (apart < distance || apart >= distance + step) return
        const lo = Math.max(Math.min(a[axis], b[axis]), Math.min(f[axis], q[axis]))
        const hi = Math.min(Math.max(a[axis], b[axis]), Math.max(f[axis], q[axis]))
        total += Math.max(0, hi - lo)
      })
      return total
    }
    let alongside = 0
    let horizontal = 0
    ret.slice(1).forEach((b, i) => {
      const a = ret[i]!
      if (a.z === b.z) horizontal += Math.abs(b.x - a.x) + Math.abs(b.y - a.y)
      alongside += along(a, b)
    })
    expect(alongside / horizontal).toBeGreaterThan(0.6)
  })

  it('rips up a pipe that blocks the only way of another and routes both', () => {
    // A barrier up to the ceiling across the room, with one low gap (200 wide, 150 high)
    // that takes a single pipe.
    let scene = facing()
    const block = (id: string, y: number, depth: number, bottom: number) =>
      addObstacle(scene, {
        id,
        name: 'Pregrada',
        category: 'structure',
        center: { x: 1600, y },
        width: 100,
        depth,
        rotation: 0,
        bottom,
        height: 2600 - bottom,
      })
    scene = unwrap(block('b1', 400, 800, 0))
    scene = unwrap(block('b2', 1400, 800, 0))
    scene = unwrap(block('b3', 900, 200, 150))
    // Cold water may only run low (and not through walls): it can only use the gap.
    const rules: RoutingRule[] = [
      {
        id: 'h',
        active: true,
        source: 'test',
        hard: true,
        kind: 'heightRange',
        systemId: 'cold',
        min: null,
        max: 500,
      },
      {
        id: 'w',
        active: true,
        source: 'test',
        hard: true,
        kind: 'noCrossing',
        systemId: 'cold',
        element: 'wall',
      },
    ]
    scene = withPipes({ ...scene, rules }, [
      ['flow', port('L', 's'), port('R', 's')],
      ['cold', port('L', 'c'), port('R', 'c')],
    ])
    const { scene: done, results } = routeAll(scene, ['flow', 'cold'], LIMITS)
    expect(results.map((r) => [r.pipeId, r.outcome.ok])).toEqual([
      ['flow', true],
      ['cold', true],
    ])
    const cold = done.pipes.find((x) => x.id === 'cold')!.route
    const flow = done.pipes.find((x) => x.id === 'flow')!.route
    const throughGap = (route: Point3[]) =>
      route.slice(1).some((b, i) => {
        const a = route[i]!
        return (
          a.y === b.y &&
          a.y > 800 &&
          a.y < 1000 &&
          Math.min(a.x, b.x) < 1550 &&
          Math.max(a.x, b.x) > 1650 &&
          a.z < 150
        )
      })
    expect(Math.max(...cold.map((q) => q.z))).toBeLessThanOrEqual(500)
    expect(throughGap(cold)).toBe(true)
    // The flow pipe gave the gap up and found another way.
    expect(throughGap(flow)).toBe(false)
    // Without ripping up, the cold pipe finds no way.
    const stuck = routeAll(scene, ['flow', 'cold'], {
      limits: { ...LIMITS.limits, ripUpRounds: 0 },
    })
    expect(stuck.results.map((r) => [r.pipeId, r.outcome.ok])).toEqual([
      ['flow', true],
      ['cold', false],
    ])
  }, 120_000)
})
