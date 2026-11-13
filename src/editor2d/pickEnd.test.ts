import { describe, expect, it } from 'vitest'
import { addEquipment } from '../core/equipmentOps'
import { addPipe } from '../core/pipeOps'
import type { EquipmentType, PipeEnd, Scene } from '../core/scene'
import type { SceneResult } from '../core/sceneResult'
import { roomScene } from '../core/testFixtures'
import { pickEnd } from './pickEnd'

function unwrap(result: SceneResult): Scene {
  if (!result.ok) throw new Error(result.error)
  return result.scene
}

/** Cylinder with three ports at the same plan point, at different heights. */
const cylinder: EquipmentType = {
  id: 'c',
  name: 'Cyl',
  tagPrefix: 'CYL',
  shape: { kind: 'cylinder', diameter: 600, height: 1600 },
  mounting: 'floor',
  ports: [
    {
      id: 'coilf',
      name: 'Grelnik D',
      systemId: 'supply',
      position: { x: 0, y: -300, z: 900 },
      direction: '-y',
      size: '',
      outerDiameter: 22,
    },
    {
      id: 'coilr',
      name: 'Grelnik P',
      systemId: 'return',
      position: { x: 0, y: -300, z: 500 },
      direction: '-y',
      size: '',
      outerDiameter: 22,
    },
    {
      id: 'cold',
      name: 'Hladna',
      systemId: 'cold',
      position: { x: 0, y: -300, z: 200 },
      direction: '-y',
      size: '',
      outerDiameter: 22,
    },
  ],
}
const unit: EquipmentType = {
  ...cylinder,
  id: 'u',
  tagPrefix: 'U',
  shape: { kind: 'box', width: 400, depth: 300, height: 500 },
  ports: [{ ...cylinder.ports[1]!, id: 'ret', position: { x: 0, y: -150, z: 250 } }],
}

function scene(): Scene {
  let s = unwrap(
    addEquipment(roomScene(), { id: 'cyl', type: cylinder, position: { x: 2700, y: 900 } }),
  )
  s = unwrap(addEquipment(s, { id: 'u', type: unit, position: { x: 800, y: 900 } }))
  return s
}

const port = (equipmentId: string, portId: string): PipeEnd => ({
  kind: 'port',
  equipmentId,
  portId,
})
const stacked = [port('cyl', 'coilf'), port('cyl', 'coilr'), port('cyl', 'cold')]

describe('pickEnd', () => {
  it('connects to the stacked port of the matching system', () => {
    expect(pickEnd(scene(), stacked, port('u', 'ret'))).toEqual({
      kind: 'connect',
      end: port('cyl', 'coilr'),
    })
  })

  it('starts from the first free port with a diameter', () => {
    let s = scene()
    s = unwrap(addPipe(s, { id: 'p', from: port('cyl', 'coilr'), to: port('u', 'ret') }))
    expect(pickEnd(s, [port('cyl', 'coilr'), port('cyl', 'cold')], null)).toEqual({
      kind: 'source',
      end: port('cyl', 'cold'),
    })
  })

  it('cycles through the stacked ports when the same spot is clicked again', () => {
    expect(pickEnd(scene(), stacked, port('cyl', 'coilf'))).toEqual({
      kind: 'source',
      end: port('cyl', 'coilr'),
    })
    expect(pickEnd(scene(), stacked, port('cyl', 'cold'))).toEqual({
      kind: 'source',
      end: port('cyl', 'coilf'),
    })
  })

  it('returns the first end when nothing there can be connected (to explain why)', () => {
    expect(pickEnd(scene(), [port('cyl', 'cold')], port('u', 'ret'))).toEqual({
      kind: 'connect',
      end: port('cyl', 'cold'),
    })
  })

  it('reports an empty click', () => {
    expect(pickEnd(scene(), [], null)).toEqual({ kind: 'none' })
  })
})
