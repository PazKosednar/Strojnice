import { describe, expect, it } from 'vitest'
import { createEmptyScene } from './scene'
import { addSystem, removeSystem, updateSystem } from './systemOps'

describe('systemOps', () => {
  it('renames and recolours a system, keeping its id', () => {
    const result = updateSystem(createEmptyScene(), 'supply', {
      name: ' Ogrevanje ',
      color: '#aa0000',
    })
    expect(result.ok && result.scene.settings.systems[0]).toEqual({
      id: 'supply',
      name: 'Ogrevanje',
      color: '#aa0000',
      lineStyle: 'solid',
      insulationThickness: 0,
    })
  })

  it('rejects an empty name or a malformed colour', () => {
    const scene = createEmptyScene()
    expect(updateSystem(scene, 'supply', { name: '  ' })).toEqual({
      ok: false,
      error: 'invalidSystem',
    })
    expect(updateSystem(scene, 'supply', { color: 'red' })).toEqual({
      ok: false,
      error: 'invalidSystem',
    })
    expect(updateSystem(scene, 'nope', { name: 'x' })).toEqual({ ok: false, error: 'notFound' })
  })

  it('adds a system and rejects a duplicate id', () => {
    const scene = createEmptyScene()
    const added = addSystem(scene, {
      id: 'gas',
      name: 'Plin',
      color: '#ffcc00',
      lineStyle: 'solid',
      insulationThickness: 0,
    })
    expect(added.ok && added.scene.settings.systems).toHaveLength(5)
    expect(
      addSystem(scene, {
        id: 'supply',
        name: 'X',
        color: '#000000',
        lineStyle: 'solid',
        insulationThickness: 0,
      }),
    ).toEqual({
      ok: false,
      error: 'invalidSystem',
    })
  })

  it('changes the insulation thickness (whole mm, 0 or more)', () => {
    const scene = createEmptyScene()
    const result = updateSystem(scene, 'cold', { insulationThickness: 13 })
    expect(result.ok && result.scene.settings.systems.find((s) => s.id === 'cold')).toMatchObject({
      insulationThickness: 13,
    })
    for (const bad of [-1, 2.5]) {
      expect(updateSystem(scene, 'cold', { insulationThickness: bad })).toEqual({
        ok: false,
        error: 'invalidSystem',
      })
    }
  })

  it('removes a system without touching the others', () => {
    const result = removeSystem(createEmptyScene(), 'dhw')
    expect(result.ok && result.scene.settings.systems.map((s) => s.id)).toEqual([
      'supply',
      'return',
      'cold',
    ])
  })

  it('does not mutate the input scene', () => {
    const scene = createEmptyScene()
    updateSystem(scene, 'supply', { name: 'X' })
    expect(scene.settings.systems[0]!.name).toBe('Dvižni vod')
  })
})
