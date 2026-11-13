import { describe, expect, it } from 'vitest'
import { addEquipment } from '../equipmentOps'
import { addPipe } from '../pipeOps'
import type { EquipmentType, PipeEnd, Port, Scene } from '../scene'
import type { SceneResult } from '../sceneResult'
import { addTerminal } from '../terminalOps'
import { roomScene } from '../testFixtures'
import { addChosenPipes, proposeConnections } from './proposeConnections'

function unwrap(result: SceneResult): Scene {
  if (!result.ok) throw new Error(result.error)
  return result.scene
}

const p = (
  id: string,
  systemId: string,
  outerDiameter: number,
  extra: Partial<Port> = {},
): Port => ({
  id,
  name: id,
  systemId,
  position: { x: 0, y: -100, z: 100 },
  direction: '-y',
  size: '',
  outerDiameter,
  ...extra,
})

const box = (id: string, tagPrefix: string, ports: Port[]): EquipmentType => ({
  id,
  name: id,
  tagPrefix,
  shape: { kind: 'box', width: 400, depth: 200, height: 600 },
  mounting: 'floor',
  ports,
})

// Like the Vitocal 250-A: keys only on the primary circuit.
const odu = box('odu', 'HP', [
  p('A', 'supply', 28, { connectionKey: 'primary-flow', flow: 'out' }),
  p('B', 'return', 28, { connectionKey: 'primary-return', flow: 'in' }),
])
const idu = box('idu', 'IDU', [
  p('A', 'supply', 28),
  p('B', 'supply', 22),
  p('C', 'supply', 28, { connectionKey: 'primary-flow', flow: 'in' }),
  p('D', 'return', 28, { connectionKey: 'primary-return', flow: 'out' }),
  p('E', 'return', 22),
  p('F', 'return', 28),
])
const cylinder = box('cyl', 'CYL', [
  p('in', 'supply', 22),
  p('out', 'return', 22),
  p('cold', 'cold', 22),
])

const port = (equipmentId: string, portId: string): PipeEnd => ({
  kind: 'port',
  equipmentId,
  portId,
})
const terminal = (terminalId: string): PipeEnd => ({ kind: 'terminal', terminalId })

function plantRoom(): Scene {
  let scene = roomScene()
  scene = unwrap(addEquipment(scene, { id: 'hp', type: odu, position: { x: -800, y: 900 } }))
  scene = unwrap(addEquipment(scene, { id: 'idu', type: idu, position: { x: 1600, y: 1500 } }))
  scene = unwrap(addEquipment(scene, { id: 'cyl', type: cylinder, position: { x: 2800, y: 900 } }))
  return unwrap(
    addTerminal(scene, {
      id: 't1',
      wallId: 'w1',
      offset: 2500,
      height: 300,
      systemId: 'cold',
      outerDiameter: 22,
    }),
  )
}

describe('proposeConnections', () => {
  it('pairs by key (out -> in) and by only candidate; leaves ports without a partner out', () => {
    const proposals = proposeConnections(plantRoom())
    const summary = proposals.map((x) => [x.reason, x.from, x.to])
    expect(summary).toContainEqual(['key', port('hp', 'A'), port('idu', 'C')])
    expect(summary).toContainEqual(['key', port('idu', 'D'), port('hp', 'B')])
    // IDU B (supply 22) and the cylinder coil inlet are each other's only candidate.
    expect(summary).toContainEqual(['onlyCandidate', port('cyl', 'in'), port('idu', 'B')])
    expect(summary).toContainEqual(['onlyCandidate', port('cyl', 'out'), port('idu', 'E')])
    expect(summary).toContainEqual(['onlyCandidate', port('cyl', 'cold'), terminal('t1')])
    // IDU A and F (DN 28) have no free partner: not proposed.
    expect(proposals).toHaveLength(5)
  })

  it('is ambiguous when there are several candidates', () => {
    const scene = unwrap(
      addTerminal(plantRoom(), {
        id: 't2',
        wallId: 'w1',
        offset: 2000,
        height: 300,
        systemId: 'cold',
        outerDiameter: 22,
      }),
    )
    const cold = proposeConnections(scene).find(
      (x) => x.from.kind === 'port' && x.systemId === 'cold',
    )
    expect(cold).toMatchObject({ reason: 'ambiguous', to: null })
    expect(cold!.candidates).toEqual([terminal('t1'), terminal('t2')])
  })

  it('does not propose ends that already have a pipe, and is deterministic', () => {
    const scene = unwrap(
      addPipe(plantRoom(), { id: 'x', from: port('hp', 'A'), to: port('idu', 'C') }),
    )
    const proposals = proposeConnections(scene)
    expect(proposals.some((x) => x.id === 'port:hp:A')).toBe(false)
    expect(proposeConnections(scene)).toEqual(proposals)
  })

  it('makes a key ambiguous when two outdoor units share it', () => {
    const scene = unwrap(
      addEquipment(plantRoom(), { id: 'hp2', type: odu, position: { x: -800, y: 300 } }),
    )
    const flows = proposeConnections(scene).filter(
      (x) => x.systemId === 'supply' && x.from.kind === 'port' && x.from.portId === 'A',
    )
    expect(flows.map((x) => x.reason)).toEqual(['ambiguous', 'ambiguous'])
    expect(flows[0]!.candidates).toEqual([port('idu', 'C')])
  })
})

describe('addChosenPipes', () => {
  it('adds automatic pipes without routes for the confirmed pairs', () => {
    let n = 0
    const result = addChosenPipes(
      plantRoom(),
      [
        { from: port('hp', 'A'), to: port('idu', 'C') },
        { from: port('idu', 'D'), to: port('hp', 'B') },
      ],
      () => `p${++n}`,
    )
    if (!result.ok) throw new Error(result.error)
    expect(result.ids).toEqual(['p1', 'p2'])
    expect(result.scene.pipes.map((x) => [x.id, x.mode, x.route.length])).toEqual([
      ['p1', 'auto', 0],
      ['p2', 'auto', 0],
    ])
  })

  it('rejects an end used twice and a system mismatch', () => {
    const twice = addChosenPipes(
      plantRoom(),
      [
        { from: port('cyl', 'cold'), to: terminal('t1') },
        { from: port('cyl', 'cold'), to: terminal('t1') },
      ],
      () => 'x',
    )
    expect(twice).toMatchObject({ ok: false, error: 'pipeEndInUse' })
    const mismatch = addChosenPipes(
      plantRoom(),
      [{ from: port('cyl', 'in'), to: terminal('t1') }],
      () => 'x',
    )
    expect(mismatch).toMatchObject({ ok: false, error: 'pipeSystemMismatch' })
  })
})
