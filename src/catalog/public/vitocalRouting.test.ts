import { describe, expect, it } from 'vitest'
import { addEquipment } from '../../core/equipmentOps'
import { addPipe, setPipeRoute } from '../../core/pipeOps'
import { routeAll } from '../../core/routing/routeAll'
import { routePipe, type RouteOutcome } from '../../core/routing/routePipe'
import type { EquipmentType, PipeEnd, Scene } from '../../core/scene'
import type { SceneResult } from '../../core/sceneResult'
import { roomScene } from '../../core/testFixtures'
import { PUBLIC_PRODUCTS } from './index'

function unwrap(result: SceneResult): Scene {
  if (!result.ok) throw new Error(result.error)
  return result.scene
}

function expectOk(outcome: RouteOutcome) {
  if (!outcome.ok) throw new Error(`routing failed: ${outcome.reason}`)
  return outcome
}

const typeOf = (id: string): EquipmentType => PUBLIC_PRODUCTS.find((p) => p.type.id === id)!.type
const ODU = typeOf('viessmann-vitocal-250-a-odu-250-a')
const IDU = typeOf('viessmann-vitocal-250-a-idu-a')
const port = (equipmentId: string, portId: string): PipeEnd => ({
  kind: 'port',
  equipmentId,
  portId,
})
const LIMITS = { limits: { timeBudgetMs: 30_000 } }

describe('Vitocal 250-A: outdoor unit on the floor outside, indoor unit on the wall', () => {
  it('routes the primary flow and return; the pipes leave the outdoor unit below its casing', () => {
    // Room 3200 × 1800 (walls on 0..3200 / 0..1800). ODU outside the left wall, its back
    // (with the connections) towards the wall; IDU on the top wall at 1200 mm.
    let scene = roomScene()
    scene = unwrap(
      addEquipment(scene, { id: 'odu', type: ODU, position: { x: -800, y: 900 }, rotation: 90 }),
    )
    scene = unwrap(
      addEquipment(scene, {
        id: 'idu',
        type: IDU,
        position: { x: 1600, y: 1517 },
        rotation: 0,
        elevation: 1200,
      }),
    )
    const [s1, flow] = (() => {
      const next = unwrap(addPipe(scene, { id: 'f', from: port('odu', 'A'), to: port('idu', 'C') }))
      return [next, next.pipes.find((p) => p.id === 'f')!] as const
    })()
    const flowRoute = expectOk(routePipe(s1, flow, LIMITS))
    const s2 = unwrap(setPipeRoute(s1, 'f', { route: flowRoute.route }))
    const withReturn = unwrap(
      addPipe(s2, { id: 'r', from: port('idu', 'D'), to: port('odu', 'B') }),
    )
    const ret = withReturn.pipes.find((p) => p.id === 'r')!
    const returnRoute = expectOk(routePipe(withReturn, ret, LIMITS))

    for (const route of [flowRoute, returnRoute]) {
      // One wall penetration (the left wall) and an axis-parallel route.
      expect(route.crossings.map((c) => c.wallId)).toEqual(['w4'])
    }
    // Out of the ODU connection (67 mm up, facing down) straight down, never below the floor.
    expect(flowRoute.route[0]!.z).toBe(67)
    expect(flowRoute.route[1]!.z).toBeLessThan(67)
    expect(Math.min(...flowRoute.route.map((p) => p.z))).toBeGreaterThanOrEqual(14)
  })

  it('routes flow and return together, side by side at the spacing (coarse grid too)', () => {
    let scene = roomScene()
    scene = unwrap(
      addEquipment(scene, { id: 'odu', type: ODU, position: { x: -800, y: 900 }, rotation: 270 }),
    )
    scene = unwrap(
      addEquipment(scene, {
        id: 'idu',
        type: IDU,
        position: { x: 1200, y: 1517 },
        elevation: 1200,
      }),
    )
    scene = unwrap(addPipe(scene, { id: 'f', from: port('odu', 'A'), to: port('idu', 'C') }))
    scene = unwrap(addPipe(scene, { id: 'r', from: port('idu', 'D'), to: port('odu', 'B') }))
    const { scene: done, results } = routeAll(scene, ['r', 'f'], LIMITS)
    expect(results.every((x) => x.outcome.ok)).toBe(true)
    const flow = done.pipes.find((p) => p.id === 'f')!.route
    const ret = done.pipes.find((p) => p.id === 'r')!.route
    const distance = 14 + 14 + scene.settings.pipeSpacing
    // Horizontal runs of the return that lie exactly at the spacing beside a flow run.
    let beside = 0
    let horizontal = 0
    ret.slice(1).forEach((b, i) => {
      const a = ret[i]!
      if (a.z !== b.z) return
      const axis = a.x !== b.x ? 'x' : 'y'
      const other = axis === 'x' ? 'y' : 'x'
      horizontal += Math.abs(b[axis] - a[axis])
      flow.slice(1).forEach((q, j) => {
        const f = flow[j]!
        if (f.z !== q.z || f[axis] === q[axis]) return
        if (Math.hypot(a[other] - f[other], a.z - f.z) !== distance) return
        const lo = Math.max(Math.min(a[axis], b[axis]), Math.min(f[axis], q[axis]))
        const hi = Math.min(Math.max(a[axis], b[axis]), Math.max(f[axis], q[axis]))
        beside += Math.max(0, hi - lo)
      })
    })
    expect(beside / horizontal).toBeGreaterThan(0.8)
  })

  it('says why when the indoor unit still stands at 0 mm (connections at the floor)', () => {
    let scene = roomScene()
    scene = unwrap(addEquipment(scene, { id: 'odu', type: ODU, position: { x: -800, y: 900 } }))
    scene = unwrap(addEquipment(scene, { id: 'idu', type: IDU, position: { x: 1600, y: 1517 } }))
    scene = unwrap(addPipe(scene, { id: 'p', from: port('idu', 'C'), to: port('odu', 'A') }))
    expect(routePipe(scene, scene.pipes[0]!, LIMITS)).toEqual({ ok: false, reason: 'startAtFloor' })
  })
})
