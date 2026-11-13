import { describe, expect, it } from 'vitest'
import { addEquipment } from '../core/equipmentOps'
import type { EquipmentType, Scene } from '../core/scene'
import type { SceneResult } from '../core/sceneResult'
import { roomScene } from '../core/testFixtures'
import { endStates } from './endStates'

function unwrap(result: SceneResult): Scene {
  if (!result.ok) throw new Error(result.error)
  return result.scene
}

const unit: EquipmentType = {
  id: 'u',
  name: 'Unit',
  tagPrefix: 'U',
  shape: { kind: 'box', width: 400, depth: 300, height: 500 },
  mounting: 'floor',
  ports: [
    {
      id: 'flow',
      name: 'D',
      systemId: 'supply',
      position: { x: -100, y: -150, z: 250 },
      direction: '-y',
      size: '',
      outerDiameter: 22,
    },
    {
      id: 'ret',
      name: 'P',
      systemId: 'return',
      position: { x: 100, y: -150, z: 250 },
      direction: '-y',
      size: '',
      outerDiameter: 22,
    },
    {
      id: 'cold',
      name: 'H',
      systemId: 'cold',
      position: { x: 0, y: -150, z: 100 },
      direction: '-y',
      size: '',
    },
  ],
}

function scene(): Scene {
  let s = unwrap(addEquipment(roomScene(), { id: 'a', type: unit, position: { x: 700, y: 900 } }))
  s = unwrap(addEquipment(s, { id: 'b', type: unit, position: { x: 2500, y: 900 } }))
  return s
}

describe('endStates', () => {
  it('marks ports without a diameter when nothing is picked', () => {
    const states = endStates(scene(), null)
    expect(states.get('port:a:cold')).toBe('missing')
    expect(states.get('port:a:flow')).toBe('normal')
  })

  it('highlights valid targets of the same system and dims the rest', () => {
    const states = endStates(scene(), { kind: 'port', equipmentId: 'a', portId: 'flow' })
    expect(states.get('port:a:flow')).toBe('source')
    expect(states.get('port:b:flow')).toBe('target')
    expect(states.get('port:b:ret')).toBe('dim')
    expect(states.get('port:b:cold')).toBe('dim')
  })
})
