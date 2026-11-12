import { describe, expect, it } from 'vitest'
import { addEquipment } from './equipmentOps'
import { diameterMismatch, pipeClashes, pipeEndPoints, routeDisconnected } from './pipeChecks'
import { addPipe, setPipeRoute, setPortDiameter } from './pipeOps'
import type { EquipmentType, Pipe, Scene } from './scene'
import type { SceneResult } from './sceneResult'
import { sceneWarnings } from './sceneWarnings'
import { roomScene } from './testFixtures'

function unwrap(result: SceneResult): Scene {
  if (!result.ok) throw new Error(`expected ok, got ${result.error}`)
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

const block: EquipmentType = {
  id: 'block',
  name: 'Block',
  tagPrefix: 'B',
  shape: { kind: 'box', width: 200, depth: 200, height: 1000 },
  mounting: 'floor',
  ports: [],
}

/** Units "a" at (700, 1300) and "b" at (2500, 1300); ports at (800, 1150) and (2600, 1150). */
function connected(): Scene {
  let scene = unwrap(
    addEquipment(roomScene(), { id: 'a', type: unit, position: { x: 700, y: 1300 } }),
  )
  scene = unwrap(addEquipment(scene, { id: 'b', type: unit, position: { x: 2500, y: 1300 } }))
  return unwrap(
    addPipe(scene, {
      id: 'p',
      from: { kind: 'port', equipmentId: 'a', portId: 'ret' },
      to: { kind: 'port', equipmentId: 'b', portId: 'ret' },
    }),
  )
}

const route = [
  { x: 800, y: 1150, z: 250 },
  { x: 800, y: 800, z: 250 },
  { x: 2600, y: 800, z: 250 },
  { x: 2600, y: 1150, z: 250 },
]

const pipe = (scene: Scene): Pipe => scene.pipes[0]!

describe('pipeEndPoints / routeDisconnected', () => {
  it('gives the rounded connection points', () => {
    const scene = connected()
    expect(pipeEndPoints(scene, pipe(scene))).toEqual({
      from: { x: 800, y: 1150, z: 250 },
      to: { x: 2600, y: 1150, z: 250 },
    })
  })

  it('detects a route whose end no longer meets the port', () => {
    let scene = unwrap(setPipeRoute(connected(), 'p', { route, mode: 'manual' }))
    expect(routeDisconnected(scene, pipe(scene))).toBe(false)
    scene = unwrap(addEquipment(scene, { id: 'x', type: block, position: { x: 1600, y: 300 } }))
    const moved = {
      ...scene,
      equipment: scene.equipment.map((e) =>
        e.id === 'b' ? { ...e, position: { x: 2400, y: 1300 } } : e,
      ),
    }
    expect(routeDisconnected(moved, pipe(moved))).toBe(true)
  })
})

describe('diameterMismatch', () => {
  it('is false for equal ends and true once one end changes', () => {
    const scene = connected()
    expect(diameterMismatch(scene, pipe(scene))).toBe(false)
    const changed = unwrap(setPortDiameter(scene, 'b', 'ret', 28))
    expect(diameterMismatch(changed, pipe(changed))).toBe(true)
  })
})

describe('pipeClashes', () => {
  it('finds equipment and other pipes in the way of a route', () => {
    let scene = unwrap(setPipeRoute(connected(), 'p', { route, mode: 'manual' }))
    expect(pipeClashes(scene, pipe(scene))).toEqual([])
    scene = unwrap(addEquipment(scene, { id: 'x', type: block, position: { x: 1600, y: 800 } }))
    expect(pipeClashes(scene, pipe(scene))).toEqual([{ kind: 'equipment', id: 'x' }])
  })

  it('ignores the equipment at its own ends', () => {
    const scene = unwrap(setPipeRoute(connected(), 'p', { route, mode: 'manual' }))
    expect(pipeClashes(scene, pipe(scene)).filter((c) => c.id === 'a' || c.id === 'b')).toEqual([])
  })
})

describe('sceneWarnings for pipes', () => {
  it('reports a pipe without a route with its reason', () => {
    const scene = unwrap(setPipeRoute(connected(), 'p', { route: [], routeError: 'Ni poti.' }))
    expect(sceneWarnings(scene)).toContainEqual({
      kind: 'pipeNoRoute',
      pipeId: 'p',
      reason: 'Ni poti.',
    })
  })

  it('reports disconnected and clashing manual routes, but not automatic ones', () => {
    let scene = unwrap(setPipeRoute(connected(), 'p', { route, mode: 'manual' }))
    scene = unwrap(addEquipment(scene, { id: 'x', type: block, position: { x: 1600, y: 800 } }))
    scene = {
      ...scene,
      equipment: scene.equipment.map((e) =>
        e.id === 'b' ? { ...e, position: { x: 2400, y: 1300 } } : e,
      ),
    }
    const kinds = sceneWarnings(scene).map((w) => w.kind)
    expect(kinds).toContain('pipeDisconnected')
    expect(kinds).toContain('pipeClash')

    const auto = { ...scene, pipes: scene.pipes.map((p) => ({ ...p, mode: 'auto' as const })) }
    const autoKinds = sceneWarnings(auto).map((w) => w.kind)
    expect(autoKinds).not.toContain('pipeDisconnected')
    expect(autoKinds).not.toContain('pipeClash')
  })

  it('reports different diameters', () => {
    const scene = unwrap(
      setPortDiameter(unwrap(setPipeRoute(connected(), 'p', { route })), 'b', 'ret', 28),
    )
    expect(sceneWarnings(scene)).toContainEqual({ kind: 'pipeDiameterMismatch', pipeId: 'p' })
  })
})
