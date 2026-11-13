import { describe, expect, it } from 'vitest'
import { addEquipment } from '../core/equipmentOps'
import { pipeTotals } from '../core/pipeTotals'
import { routeAll } from '../core/routing/routeAll'
import type { EquipmentType, PipeEnd, Scene } from '../core/scene'
import type { SceneResult } from '../core/sceneResult'
import { roomScene } from '../core/testFixtures'
import { acceptPreview, applyJointResult, withProposedPipes } from './autoConnect'

function unwrap(result: SceneResult): Scene {
  if (!result.ok) throw new Error(result.error)
  return result.scene
}

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
      position: { x: 0, y: -150, z: 300 },
      direction: '-y',
      size: '',
      outerDiameter: 22,
    },
    {
      id: 'x',
      name: 'Brez premera',
      systemId: 'cold',
      position: { x: 100, y: -150, z: 300 },
      direction: '-y',
      size: '',
    },
  ],
}
const port = (equipmentId: string, portId: string): PipeEnd => ({
  kind: 'port',
  equipmentId,
  portId,
})

function base(): Scene {
  let scene = roomScene()
  scene = unwrap(addEquipment(scene, { id: 'a', type: unit, position: { x: 700, y: 1300 } }))
  return unwrap(addEquipment(scene, { id: 'b', type: unit, position: { x: 2500, y: 1300 } }))
}

describe('auto connect preview', () => {
  it('adds the pairs, routes them and accepts them as one change', () => {
    const start = base()
    let n = 0
    const added = withProposedPipes(
      start,
      [{ from: port('a', 'c'), to: port('b', 'c') }],
      () => `p${++n}`,
    )
    if ('error' in added) throw new Error('rejected')
    const { scene: routed, results } = routeAll(added.scene, added.ids, {
      limits: { timeBudgetMs: 30_000 },
    })
    const routes = routed.pipes.map((p) => ({ pipeId: p.id, route: p.route }))
    const preview = applyJointResult(added.scene, results, routes)
    expect(preview.pipes[0]!.route.length).toBeGreaterThan(1)

    const before = pipeTotals(start)
    const after = pipeTotals(preview)
    expect(before).toMatchObject({ pipes: 0, length: 0 })
    expect(after.pipes).toBe(1)
    expect(after.length).toBeGreaterThan(1800)
    expect(after.unrouted).toBe(0)

    // Discarding = not applying: the base scene is untouched.
    expect(start.pipes).toEqual([])
    const accepted = acceptPreview(preview, ['p1'])(start)
    if (!accepted.ok) throw new Error(accepted.error)
    expect(accepted.scene.pipes).toEqual(preview.pipes)
    // Accepting none changes nothing.
    expect(acceptPreview(preview, [])(start)).toEqual({ ok: true, scene: start })
  })

  it('keeps the reason of a pipe that could not be routed', () => {
    const start = base()
    const added = withProposedPipes(
      start,
      [{ from: port('a', 'c'), to: port('b', 'c') }],
      () => 'p',
    )
    if ('error' in added) throw new Error('rejected')
    const preview = applyJointResult(
      added.scene,
      [{ pipeId: 'p', outcome: { ok: false, reason: 'noPath' } }],
      [{ pipeId: 'p', route: [] }],
    )
    expect(preview.pipes[0]).toMatchObject({ route: [] })
    expect(preview.pipes[0]!.routeError).toContain('ni proste poti')
  })

  it('rejects pairs that cannot be connected', () => {
    const added = withProposedPipes(
      base(),
      [{ from: port('a', 'x'), to: port('b', 'c') }],
      () => 'p',
    )
    expect(added).toMatchObject({ error: { ok: false, error: 'pipeEndNoDiameter' } })
  })
})
