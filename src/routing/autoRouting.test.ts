import { describe, expect, it } from 'vitest'
import { addEquipment, moveEquipment } from '../core/equipmentOps'
import { addPipe, setPipeMode, setPipeRoute } from '../core/pipeOps'
import { routePipe } from '../core/routing/routePipe'
import type { EquipmentType, Scene } from '../core/scene'
import type { SceneResult } from '../core/sceneResult'
import { roomScene } from '../core/testFixtures'
import { applyRouteOutcome, autoPipeIds, pipesNeedingRoute, routeErrorMessage } from './autoRouting'

function unwrap(result: SceneResult | null): Scene {
  if (!result || !result.ok) throw new Error(`expected ok, got ${result ? result.error : 'null'}`)
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

function connected(): Scene {
  let scene = roomScene()
  scene = { ...scene, settings: { ...scene.settings, routingGrid: 100 } }
  scene = unwrap(addEquipment(scene, { id: 'a', type: unit, position: { x: 700, y: 1300 } }))
  scene = unwrap(addEquipment(scene, { id: 'b', type: unit, position: { x: 2500, y: 1300 } }))
  return unwrap(
    addPipe(scene, {
      id: 'p',
      from: { kind: 'port', equipmentId: 'a', portId: 'ret' },
      to: { kind: 'port', equipmentId: 'b', portId: 'ret' },
    }),
  )
}

function routed(): Scene {
  const scene = connected()
  return unwrap(applyRouteOutcome(scene, 'p', routePipe(scene, scene.pipes[0]!)))
}

describe('pipesNeedingRoute', () => {
  it('includes a new automatic pipe without a route', () => {
    expect(pipesNeedingRoute(null, connected())).toEqual(['p'])
  })

  it('does not include a routed pipe whose ends did not move', () => {
    const scene = routed()
    expect(pipesNeedingRoute(scene, scene)).toEqual([])
  })

  it('includes an automatic pipe when its equipment moves', () => {
    const before = routed()
    const after = unwrap(moveEquipment(before, 'b', { x: 2400, y: 1300 }))
    expect(pipesNeedingRoute(before, after)).toEqual(['p'])
  })

  it('never includes manual pipes', () => {
    const before = unwrap(setPipeMode(routed(), 'p', 'manual'))
    const after = unwrap(moveEquipment(before, 'b', { x: 2400, y: 1300 }))
    expect(pipesNeedingRoute(before, after)).toEqual([])
  })

  it('retries a failed pipe only when one of its ends changed', () => {
    const failed = unwrap(setPipeRoute(connected(), 'p', { route: [], routeError: 'x' }))
    expect(pipesNeedingRoute(failed, failed)).toEqual([])
    const moved = unwrap(moveEquipment(failed, 'a', { x: 800, y: 1300 }))
    expect(pipesNeedingRoute(failed, moved)).toEqual(['p'])
  })

  it('re-routes all automatic pipes when obstacles, zones, rules or settings change', () => {
    const before = routed()
    const zone = {
      id: 'z',
      name: 'Cona',
      kind: 'forbidden' as const,
      center: { x: 1600, y: 900 },
      width: 400,
      depth: 400,
      rotation: 0,
      bottom: 0,
      height: 2600,
    }
    expect(pipesNeedingRoute(before, { ...before, zones: [zone] })).toEqual(['p'])
    expect(pipesNeedingRoute(before, { ...before, rules: [] })).toEqual(['p'])
    expect(pipesNeedingRoute(before, { ...before, settings: { ...before.settings } })).toEqual([
      'p',
    ])
    const manual = unwrap(setPipeMode(before, 'p', 'manual'))
    expect(pipesNeedingRoute(manual, { ...manual, obstacles: [] })).toEqual([])
  })

  it('lists all automatic pipes for re-routing everything', () => {
    expect(autoPipeIds(routed())).toEqual(['p'])
    expect(autoPipeIds(unwrap(setPipeMode(routed(), 'p', 'manual')))).toEqual([])
  })
})

describe('applyRouteOutcome', () => {
  it('stores a found route', () => {
    const scene = routed()
    expect(scene.pipes[0]!.route.length).toBeGreaterThan(2)
    expect(scene.pipes[0]!.routeError).toBeUndefined()
  })

  it('stores the reason of a failure in Slovenian', () => {
    const scene = unwrap(applyRouteOutcome(connected(), 'p', { ok: false, reason: 'startBlocked' }))
    expect(scene.pipes[0]!.routeError).toBe('Priključek U-01 / Povratni je zaprt.')
    expect(scene.pipes[0]!.route).toEqual([])
  })

  it('ignores a stale route computed before an end moved', () => {
    const scene = connected()
    const outcome = routePipe(scene, scene.pipes[0]!)
    const moved = unwrap(moveEquipment(scene, 'b', { x: 2300, y: 1300 }))
    expect(applyRouteOutcome(moved, 'p', outcome)).toBeNull()
  })

  it('ignores results for manual or removed pipes', () => {
    const scene = connected()
    const outcome = routePipe(scene, scene.pipes[0]!)
    expect(applyRouteOutcome(unwrap(setPipeMode(scene, 'p', 'manual')), 'p', outcome)).toBeNull()
    expect(applyRouteOutcome({ ...scene, pipes: [] }, 'p', outcome)).toBeNull()
  })
})

describe('routeErrorMessage', () => {
  it('names both ends', () => {
    const scene = connected()
    expect(routeErrorMessage(scene, scene.pipes[0]!, 'noPath')).toBe(
      'Med U-01 / Povratni in U-02 / Povratni ni proste poti.',
    )
  })
})
