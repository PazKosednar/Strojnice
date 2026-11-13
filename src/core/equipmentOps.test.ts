import { describe, expect, it } from 'vitest'
import {
  addEquipment,
  duplicateEquipment,
  moveEquipment,
  removeEquipment,
  rotateEquipment,
  updateEquipment,
  replaceEquipmentType,
} from './equipmentOps'
import { createEmptyScene, type Scene } from './scene'
import type { SceneResult } from './sceneResult'
import { boxType, cylinderType, roomScene } from './testFixtures'

function unwrap(result: SceneResult): Scene {
  if (!result.ok) throw new Error(`expected ok, got ${result.error}`)
  return result.scene
}

const at = { x: 1000, y: 900 }

function withCylinder(id = 'c1'): Scene {
  return unwrap(addEquipment(roomScene(), { id, type: cylinderType, position: at }))
}

describe('addEquipment', () => {
  it('assigns the first tag for the prefix and default placement values', () => {
    const scene = withCylinder()
    expect(scene.equipment).toEqual([
      { id: 'c1', tag: 'CYL-01', type: cylinderType, position: at, elevation: 0, rotation: 0 },
    ])
  })

  it('numbers tags per prefix', () => {
    let scene = withCylinder()
    scene = unwrap(addEquipment(scene, { id: 'i1', type: boxType, position: at }))
    scene = unwrap(addEquipment(scene, { id: 'c2', type: cylinderType, position: at }))
    expect(scene.equipment.map((e) => e.tag)).toEqual(['CYL-01', 'IDU-01', 'CYL-02'])
  })

  it('stores a copy of the type, independent of the catalogue object', () => {
    const type = JSON.parse(JSON.stringify(boxType)) as typeof boxType
    const scene = unwrap(addEquipment(roomScene(), { id: 'i1', type, position: at }))
    type.shape = { kind: 'box', width: 1, depth: 1, height: 1 }
    type.ports[0]!.name = 'changed'
    expect(scene.equipment[0]!.type).toEqual(boxType)
  })

  it('rounds the position and normalises the rotation', () => {
    const scene = unwrap(
      addEquipment(roomScene(), {
        id: 'i1',
        type: boxType,
        position: { x: 10.6, y: -0.2 },
        rotation: -90,
        elevation: 1200,
      }),
    )
    expect(scene.equipment[0]).toMatchObject({
      position: { x: 11, y: 0 },
      rotation: 270,
      elevation: 1200,
    })
  })

  it('rejects a duplicate or empty explicit tag and a negative elevation', () => {
    const scene = withCylinder()
    const again = { id: 'c2', type: cylinderType, position: at }
    expect(addEquipment(scene, { ...again, tag: 'CYL-01' })).toEqual({
      ok: false,
      error: 'tagTaken',
    })
    expect(addEquipment(scene, { ...again, tag: ' ' })).toEqual({ ok: false, error: 'tagEmpty' })
    expect(addEquipment(scene, { ...again, elevation: -1 })).toEqual({
      ok: false,
      error: 'invalidPlacement',
    })
  })

  it('does not mutate the input scene', () => {
    const before = roomScene()
    addEquipment(before, { id: 'c1', type: cylinderType, position: at })
    expect(before.equipment).toEqual([])
  })
})

describe('updateEquipment / moveEquipment / rotateEquipment', () => {
  it('moves and rotates', () => {
    let scene = unwrap(moveEquipment(withCylinder(), 'c1', { x: 500, y: 600 }))
    expect(scene.equipment[0]!.position).toEqual({ x: 500, y: 600 })
    scene = unwrap(rotateEquipment(scene, 'c1', 90))
    scene = unwrap(rotateEquipment(scene, 'c1', 90))
    scene = unwrap(rotateEquipment(scene, 'c1', 270))
    expect(scene.equipment[0]!.rotation).toBe(90)
  })

  it('changes the tag exactly as typed', () => {
    const scene = unwrap(updateEquipment(withCylinder(), 'c1', { tag: 'Hranilnik-A' }))
    expect(scene.equipment[0]!.tag).toBe('Hranilnik-A')
  })

  it('rejects a tag used by another item but accepts the same tag again', () => {
    let scene = withCylinder()
    scene = unwrap(addEquipment(scene, { id: 'c2', type: cylinderType, position: at }))
    expect(updateEquipment(scene, 'c2', { tag: 'CYL-01' })).toEqual({
      ok: false,
      error: 'tagTaken',
    })
    expect(updateEquipment(scene, 'c2', { tag: 'CYL-02' }).ok).toBe(true)
    expect(updateEquipment(scene, 'c2', { tag: '' })).toEqual({ ok: false, error: 'tagEmpty' })
  })

  it('rejects invalid elevation and unknown ids', () => {
    expect(updateEquipment(withCylinder(), 'c1', { elevation: 10.5 })).toEqual({
      ok: false,
      error: 'invalidPlacement',
    })
    expect(updateEquipment(withCylinder(), 'nope', { elevation: 0 })).toEqual({
      ok: false,
      error: 'notFound',
    })
  })
})

describe('removeEquipment / duplicateEquipment', () => {
  it('gives the copy the next tag and places it beside the original', () => {
    const scene = unwrap(duplicateEquipment(withCylinder(), 'c1', 'c2'))
    expect(scene.equipment[1]).toMatchObject({
      id: 'c2',
      tag: 'CYL-02',
      position: { x: 1650, y: 900 }, // diameter 600 + grid 50
      type: cylinderType,
    })
  })

  it('never renumbers tags after a removal', () => {
    let scene = unwrap(duplicateEquipment(withCylinder(), 'c1', 'c2'))
    scene = unwrap(removeEquipment(scene, 'c1'))
    expect(scene.equipment.map((e) => e.tag)).toEqual(['CYL-02'])
    scene = unwrap(duplicateEquipment(scene, 'c2', 'c3'))
    expect(scene.equipment.map((e) => e.tag)).toEqual(['CYL-02', 'CYL-03'])
  })

  it('reports unknown ids', () => {
    expect(removeEquipment(roomScene(), 'x')).toEqual({ ok: false, error: 'notFound' })
    expect(duplicateEquipment(roomScene(), 'x', 'y')).toEqual({ ok: false, error: 'notFound' })
  })
})

describe('replaceEquipmentType', () => {
  it('updates the type copy and drops pipes only at ports that no longer exist', () => {
    let scene = { ...createEmptyScene() }
    const result = addEquipment(scene, { id: 'e1', type: boxType, position: { x: 0, y: 0 } })
    if (!result.ok) throw new Error(result.error)
    scene = {
      ...result.scene,
      pipes: [
        {
          id: 'p1',
          systemId: 'supply',
          from: { kind: 'port', equipmentId: 'e1', portId: 'p1' },
          to: { kind: 'terminal', terminalId: 't' },
          outerDiameter: 22,
          route: [],
          mode: 'auto',
        },
        {
          id: 'p2',
          systemId: 'return',
          from: { kind: 'port', equipmentId: 'e1', portId: 'p2' },
          to: { kind: 'terminal', terminalId: 't2' },
          outerDiameter: 22,
          route: [],
          mode: 'auto',
        },
      ],
    }
    const newer = { ...boxType, ports: [{ ...boxType.ports[0]!, outerDiameter: 28 }] }
    const replaced = replaceEquipmentType(scene, 'e1', newer)
    if (!replaced.ok) throw new Error(replaced.error)
    expect(replaced.scene.equipment[0]!.type).toEqual(newer)
    expect(replaced.scene.equipment[0]!.type).not.toBe(newer)
    expect(replaced.scene.pipes.map((p) => p.id)).toEqual(['p1'])
    expect(replaced.scene.equipment[0]!.tag).toBe(scene.equipment[0]!.tag)
  })
})
