import { describe, expect, it } from 'vitest'
import { addEquipment, removeEquipment } from './equipmentOps'
import { endGeometry, resolveEnd } from './pipeEnds'
import { addPipe, checkConnection, removePipe, setPipeRoute, setPortDiameter } from './pipeOps'
import type { EquipmentType, PipeEnd, Scene } from './scene'
import type { SceneResult } from './sceneResult'
import { addTerminal, removeTerminal, updateTerminal } from './terminalOps'
import { roomScene } from './testFixtures'
import { removeWall } from './wallOps'

function unwrap(result: SceneResult): Scene {
  if (!result.ok) throw new Error(`expected ok, got ${result.error}`)
  return result.scene
}

/** Test type: two heating ports with diameters, one cold-water port without. */
const unit: EquipmentType = {
  id: 'unit',
  name: 'Unit',
  tagPrefix: 'HP',
  shape: { kind: 'box', width: 800, depth: 300, height: 600 },
  mounting: 'floor',
  ports: [
    {
      id: 'flow',
      name: 'Dvižni',
      systemId: 'supply',
      position: { x: -200, y: -150, z: 300 },
      direction: '-y',
      size: 'Cu 22',
      outerDiameter: 22,
    },
    {
      id: 'ret',
      name: 'Povratni',
      systemId: 'return',
      position: { x: 200, y: -150, z: 300 },
      direction: '-y',
      size: 'Cu 22',
      outerDiameter: 22,
    },
    {
      id: 'cold',
      name: 'Hladna',
      systemId: 'cold',
      position: { x: 0, y: -150, z: 100 },
      direction: '-y',
      size: 'G 1/2',
    },
  ],
}

function twoUnits(): Scene {
  let scene = unwrap(
    addEquipment(roomScene(), { id: 'a', type: unit, position: { x: 800, y: 900 } }),
  )
  const bigger = {
    ...unit,
    ports: unit.ports.map((p) => (p.id === 'flow' ? { ...p, outerDiameter: 28 } : p)),
  }
  scene = unwrap(addEquipment(scene, { id: 'b', type: bigger, position: { x: 2400, y: 900 } }))
  return scene
}

const port = (equipmentId: string, portId: string): PipeEnd => ({
  kind: 'port',
  equipmentId,
  portId,
})

describe('checkConnection', () => {
  it('accepts two free ends of the same system and reports a diameter mismatch', () => {
    expect(checkConnection(twoUnits(), port('a', 'ret'), port('b', 'ret'))).toEqual({
      ok: true,
      systemId: 'return',
      outerDiameter: 22,
      diameterMismatch: false,
    })
    expect(checkConnection(twoUnits(), port('a', 'flow'), port('b', 'flow'))).toMatchObject({
      ok: true,
      outerDiameter: 22,
      diameterMismatch: true,
    })
  })

  it('rejects different systems', () => {
    expect(checkConnection(twoUnits(), port('a', 'flow'), port('b', 'ret'))).toEqual({
      ok: false,
      error: 'pipeSystemMismatch',
    })
  })

  it('rejects a port without an outer diameter', () => {
    expect(checkConnection(twoUnits(), port('a', 'cold'), port('b', 'cold'))).toEqual({
      ok: false,
      error: 'pipeEndNoDiameter',
    })
  })

  it('rejects the same end twice and unknown ends', () => {
    expect(checkConnection(twoUnits(), port('a', 'flow'), port('a', 'flow'))).toEqual({
      ok: false,
      error: 'pipeSameEnd',
    })
    expect(checkConnection(twoUnits(), port('a', 'flow'), port('x', 'flow'))).toEqual({
      ok: false,
      error: 'notFound',
    })
  })
})

describe('addPipe', () => {
  it('creates an auto pipe without a route', () => {
    const scene = unwrap(
      addPipe(twoUnits(), { id: 'p1', from: port('a', 'ret'), to: port('b', 'ret') }),
    )
    expect(scene.pipes).toEqual([
      {
        id: 'p1',
        systemId: 'return',
        from: port('a', 'ret'),
        to: port('b', 'ret'),
        outerDiameter: 22,
        route: [],
        mode: 'auto',
      },
    ])
  })

  it('allows only one pipe per port', () => {
    const scene = unwrap(
      addPipe(twoUnits(), { id: 'p1', from: port('a', 'ret'), to: port('b', 'ret') }),
    )
    expect(addPipe(scene, { id: 'p2', from: port('b', 'ret'), to: port('a', 'ret') })).toEqual({
      ok: false,
      error: 'pipeEndInUse',
    })
  })

  it('connects once the missing diameter is entered on the placed equipment', () => {
    let scene = unwrap(setPortDiameter(twoUnits(), 'a', 'cold', 15))
    scene = unwrap(setPortDiameter(scene, 'b', 'cold', 15))
    expect(addPipe(scene, { id: 'p', from: port('a', 'cold'), to: port('b', 'cold') }).ok).toBe(
      true,
    )
    expect(setPortDiameter(scene, 'a', 'cold', 0)).toEqual({ ok: false, error: 'invalidValue' })
  })
})

describe('setPipeRoute', () => {
  const base = () =>
    unwrap(addPipe(twoUnits(), { id: 'p1', from: port('a', 'ret'), to: port('b', 'ret') }))

  it('stores an orthogonal route and the mode', () => {
    const route = [
      { x: 0, y: 0, z: 300 },
      { x: 0, y: 500, z: 300 },
      { x: 900, y: 500, z: 300 },
    ]
    const scene = unwrap(setPipeRoute(base(), 'p1', { route, mode: 'manual' }))
    expect(scene.pipes[0]).toMatchObject({ route, mode: 'manual' })
  })

  it('rejects diagonal segments and fractional coordinates', () => {
    expect(
      setPipeRoute(base(), 'p1', {
        route: [
          { x: 0, y: 0, z: 0 },
          { x: 10, y: 10, z: 0 },
        ],
      }),
    ).toEqual({ ok: false, error: 'invalidRoute' })
    expect(setPipeRoute(base(), 'p1', { route: [{ x: 0.5, y: 0, z: 0 }] })).toEqual({
      ok: false,
      error: 'invalidRoute',
    })
  })

  it('keeps the reason when no route was found and clears it on success', () => {
    let scene = unwrap(setPipeRoute(base(), 'p1', { route: [], routeError: 'Ni poti.' }))
    expect(scene.pipes[0]!.routeError).toBe('Ni poti.')
    scene = unwrap(setPipeRoute(scene, 'p1', { route: [{ x: 0, y: 0, z: 0 }] }))
    expect(scene.pipes[0]!.routeError).toBeUndefined()
  })
})

describe('terminals', () => {
  const terminal = {
    id: 't1',
    wallId: 'w2',
    offset: 900,
    height: 300,
    systemId: 'return',
    outerDiameter: 22,
  }

  it('get IZ tags that are unique together with equipment tags', () => {
    let scene = unwrap(addTerminal(twoUnits(), terminal))
    scene = unwrap(addTerminal(scene, { ...terminal, id: 't2', offset: 1200 }))
    expect(scene.terminals.map((t) => t.tag)).toEqual(['IZ-01', 'IZ-02'])
    expect(addTerminal(scene, { ...terminal, id: 't3', tag: 'HP-01' })).toEqual({
      ok: false,
      error: 'tagTaken',
    })
  })

  it('must lie on the wall', () => {
    expect(addTerminal(twoUnits(), { ...terminal, offset: 5000 })).toEqual({
      ok: false,
      error: 'invalidTerminal',
    })
    expect(addTerminal(twoUnits(), { ...terminal, height: 3000 })).toEqual({
      ok: false,
      error: 'invalidTerminal',
    })
  })

  it('can be connected and cannot change system while connected', () => {
    let scene = unwrap(addTerminal(twoUnits(), terminal))
    scene = unwrap(
      addPipe(scene, {
        id: 'p',
        from: port('a', 'ret'),
        to: { kind: 'terminal', terminalId: 't1' },
      }),
    )
    expect(updateTerminal(scene, 't1', { systemId: 'cold' })).toEqual({
      ok: false,
      error: 'pipeSystemMismatch',
    })
    expect(updateTerminal(scene, 't1', { height: 500 }).ok).toBe(true)
  })

  it('lie on the wall axis and leave towards the given side', () => {
    const scene = unwrap(addTerminal(twoUnits(), terminal))
    const end = resolveEnd(scene, { kind: 'terminal', terminalId: 't1' })!
    // Wall w2 runs from (3200, 0) up to (3200, 1800).
    expect(endGeometry(scene, end, { x: 1000, y: 900, z: 0 })).toEqual({
      point: { x: 3200, y: 900, z: 300 },
      direction: { x: -1, y: 0, z: 0 },
    })
    expect(endGeometry(scene, end, { x: 4000, y: 900, z: 0 })?.direction).toEqual({
      x: 1,
      y: 0,
      z: 0,
    })
  })
})

describe('cascading deletes', () => {
  function connected(): Scene {
    let scene = unwrap(
      addTerminal(twoUnits(), {
        id: 't1',
        wallId: 'w2',
        offset: 900,
        height: 300,
        systemId: 'return',
        outerDiameter: 22,
      }),
    )
    scene = unwrap(
      addPipe(scene, {
        id: 'p1',
        from: port('a', 'ret'),
        to: { kind: 'terminal', terminalId: 't1' },
      }),
    )
    scene = unwrap(addPipe(scene, { id: 'p2', from: port('a', 'flow'), to: port('b', 'flow') }))
    return scene
  }

  it('removing equipment removes its pipes', () => {
    expect(unwrap(removeEquipment(connected(), 'b')).pipes.map((p) => p.id)).toEqual(['p1'])
    expect(unwrap(removeEquipment(connected(), 'a')).pipes).toEqual([])
  })

  it('removing a terminal removes its pipe', () => {
    expect(unwrap(removeTerminal(connected(), 't1')).pipes.map((p) => p.id)).toEqual(['p2'])
  })

  it('removing a wall removes its terminals and their pipes', () => {
    const scene = unwrap(removeWall(connected(), 'w2'))
    expect(scene.terminals).toEqual([])
    expect(scene.pipes.map((p) => p.id)).toEqual(['p2'])
  })

  it('removing a pipe keeps both ends', () => {
    const scene = unwrap(removePipe(connected(), 'p1'))
    expect(scene.terminals).toHaveLength(1)
    expect(scene.equipment).toHaveLength(2)
  })
})
