import { describe, expect, it } from 'vitest'
import { addEquipment } from '../core/equipmentOps'
import { addPipe } from '../core/pipeOps'
import type { EquipmentType, PipeEnd, Scene } from '../core/scene'
import type { SceneResult } from '../core/sceneResult'
import { roomScene } from '../core/testFixtures'
import { connectionRejection } from './connectMessage'

function unwrap(result: SceneResult): Scene {
  if (!result.ok) throw new Error(result.error)
  return result.scene
}

const port = (id: string, systemId: string, z: number) => ({
  id,
  name: id,
  systemId,
  position: { x: 0, y: -300, z },
  direction: '-y' as const,
  size: '',
  outerDiameter: 22,
})

const cylinder: EquipmentType = {
  id: 'c',
  name: 'Cyl',
  tagPrefix: 'CYL',
  shape: { kind: 'cylinder', diameter: 600, height: 1600 },
  mounting: 'floor',
  ports: [port('coilf', 'supply', 900), port('cold', 'cold', 200)],
}
const unit: EquipmentType = {
  ...cylinder,
  id: 'u',
  tagPrefix: 'U',
  ports: [port('flow', 'supply', 900), port('flow2', 'supply', 600)],
}

const end = (equipmentId: string, portId: string): PipeEnd => ({
  kind: 'port',
  equipmentId,
  portId,
})

function scene(): Scene {
  let s = unwrap(
    addEquipment(roomScene(), { id: 'cyl', type: cylinder, position: { x: 2700, y: 900 } }),
  )
  s = unwrap(addEquipment(s, { id: 'u', type: unit, position: { x: 800, y: 900 } }))
  return unwrap(addPipe(s, { id: 'p', from: end('u', 'flow'), to: end('cyl', 'coilf') }))
}

describe('connectionRejection', () => {
  it('gives the plain reason for a single clicked end', () => {
    expect(connectionRejection(scene(), end('cyl', 'cold'), [end('u', 'flow2')])).toBe(
      'Povezava ni mogoča: oba konca morata pripadati istemu sistemu.',
    )
  })

  it('lists every stacked end with its reason', () => {
    expect(
      connectionRejection(scene(), end('u', 'flow2'), [end('cyl', 'coilf'), end('cyl', 'cold')]),
    ).toBe(
      'Na tem mestu ni ustreznega priključka: CYL-01 / coilf (že povezan), CYL-01 / cold (drug sistem).',
    )
  })
})
