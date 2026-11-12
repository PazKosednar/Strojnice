import { describe, expect, it } from 'vitest'
import { parseScene } from './parseScene'
import { createRectangularRoom } from './rectangularRoom'
import { createEmptyScene, INITIAL_SETTINGS, type Scene } from './scene'
import { cylinderType, equipment } from './testFixtures'

function room(): Scene {
  let n = 0
  const scene = createEmptyScene()
  return {
    ...scene,
    walls: createRectangularRoom(3200, 1800, scene.settings, () => `w${++n}`),
    openings: [
      {
        id: 'o1',
        wallId: 'w1',
        type: 'window',
        offset: 1000,
        width: 1200,
        height: 1200,
        sillHeight: 900,
      },
    ],
  }
}

const roundTrip = (scene: Scene): unknown => JSON.parse(JSON.stringify(scene))

function errorOf(json: unknown): string {
  const result = parseScene(json)
  if (result.ok) throw new Error('expected an error')
  return result.error
}

describe('parseScene', () => {
  it('accepts a valid scene unchanged', () => {
    const scene = room()
    expect(parseScene(roundTrip(scene))).toEqual({ ok: true, scene })
  })

  it('accepts a phase-0 empty scene without settings and fills in initial settings', () => {
    const phase0 = { version: 1, units: 'mm', walls: [], openings: [], equipment: [], pipes: [] }
    const result = parseScene(phase0)
    expect(result.ok && result.scene.settings).toEqual(INITIAL_SETTINGS)
  })

  it('rejects non-objects and unknown versions', () => {
    expect(errorOf(null)).toBe('scene: expected an object')
    expect(errorOf('hello')).toBe('scene: expected an object')
    expect(errorOf({ ...(roundTrip(room()) as object), version: 99 })).toMatch(/^version:/)
  })

  it('rejects coordinates beyond 10 km', () => {
    const json = roundTrip(room()) as { walls: { end: { x: number } }[] }
    json.walls[0]!.end.x = 1e12
    expect(errorOf(json)).toBe('walls[0].end.x: expected an integer between -10000000 and 10000000')
  })

  it('names the offending field', () => {
    const json = roundTrip(room()) as { walls: { thickness: unknown }[] }
    json.walls[1]!.thickness = 12.5
    expect(errorOf(json)).toBe('walls[1].thickness: expected an integer >= 1')
  })

  it('rejects missing lists', () => {
    const json = roundTrip(room()) as Record<string, unknown>
    delete json.openings
    expect(errorOf(json)).toBe('openings: expected an array')
  })

  it('rejects openings on unknown walls and invalid openings', () => {
    const json = roundTrip(room()) as { openings: { wallId: string; offset: number }[] }
    json.openings[0]!.wallId = 'zzz'
    expect(errorOf(json)).toMatch(/unknown wall "zzz"/)

    const json2 = roundTrip(room()) as { openings: { offset: number }[] }
    json2.openings[0]!.offset = 3000
    expect(errorOf(json2)).toBe('openings[0]: outsideWall')
  })

  it('rejects duplicate ids', () => {
    const json = roundTrip(room()) as { walls: { id: string }[] }
    json.walls[1]!.id = 'w1'
    expect(errorOf(json)).toMatch(/duplicate id "w1"/)
  })

  it('accepts placed equipment and rejects invalid equipment', () => {
    const scene = { ...room(), equipment: [equipment({ type: cylinderType, tag: 'CYL-01' })] }
    expect(parseScene(roundTrip(scene))).toEqual({ ok: true, scene })

    const bad = roundTrip(scene) as { equipment: { rotation: number }[] }
    bad.equipment[0]!.rotation = 360
    expect(errorOf(bad)).toBe('equipment[0].rotation: expected an integer between 0 and 359')
  })

  it('rejects duplicate equipment tags', () => {
    const scene = {
      ...room(),
      equipment: [equipment({ id: 'a' }), equipment({ id: 'b' })],
    }
    expect(errorOf(roundTrip(scene))).toBe('equipment[1].tag: duplicate tag "IDU-01"')
  })

  it('validates the systems in settings', () => {
    const json = roundTrip(room()) as { settings: { systems: { color: string }[] } }
    json.settings.systems[0]!.color = 'red'
    expect(errorOf(json)).toMatch(/^settings.systems\[0\].color:/)
  })

  it('accepts terminals and pipes and checks their references', () => {
    const scene: Scene = {
      ...room(),
      equipment: [equipment({ type: cylinderType, tag: 'CYL-01' })],
      terminals: [
        {
          id: 't1',
          tag: 'IZ-01',
          wallId: 'w2',
          offset: 900,
          height: 300,
          systemId: 'dhw',
          outerDiameter: 22,
        },
      ],
      pipes: [
        {
          id: 'p1',
          systemId: 'dhw',
          from: { kind: 'port', equipmentId: 'e1', portId: 'top' },
          to: { kind: 'terminal', terminalId: 't1' },
          outerDiameter: 22,
          route: [
            { x: 0, y: 0, z: 1500 },
            { x: 0, y: 0, z: 1600 },
            { x: 3200, y: 0, z: 1600 },
          ],
          mode: 'auto',
        },
      ],
    }
    expect(parseScene(roundTrip(scene))).toEqual({ ok: true, scene })

    const unknownTerminal = roundTrip(scene) as { pipes: { to: { terminalId: string } }[] }
    unknownTerminal.pipes[0]!.to.terminalId = 'nope'
    expect(errorOf(unknownTerminal)).toBe('pipes[0].to: unknown terminal "nope"')

    const diagonal = roundTrip(scene) as { pipes: { route: { x: number }[] }[] }
    diagonal.pipes[0]!.route[2]!.x = 3100
    diagonal.pipes[0]!.route[1]!.x = 50
    expect(errorOf(diagonal)).toBe('pipes[0].route[1]: segments must be axis-parallel')
  })

  it('rejects two pipes on one end and a terminal tag that equals an equipment tag', () => {
    const base: Scene = {
      ...room(),
      equipment: [equipment({ type: cylinderType, tag: 'CYL-01' })],
      terminals: [
        {
          id: 't1',
          tag: 'CYL-01',
          wallId: 'w2',
          offset: 900,
          height: 300,
          systemId: 'dhw',
          outerDiameter: 22,
        },
      ],
    }
    expect(errorOf(roundTrip(base))).toBe('terminals[0].tag: duplicate tag "CYL-01"')

    const pipe = (id: string) => ({
      id,
      systemId: 'dhw',
      from: { kind: 'port' as const, equipmentId: 'e1', portId: 'top' },
      to: { kind: 'terminal' as const, terminalId: 't1' },
      outerDiameter: 22,
      route: [],
      mode: 'auto' as const,
    })
    const twice = {
      ...base,
      terminals: [{ ...base.terminals[0]!, tag: 'IZ-01' }],
      pipes: [pipe('a'), pipe('b')],
    }
    expect(errorOf(roundTrip(twice))).toBe('pipes[1].from: end already has a pipe')
  })

  it('drops unknown extra fields', () => {
    const json = { ...(roundTrip(room()) as object), extra: true }
    const result = parseScene(json)
    expect(result.ok && 'extra' in result.scene).toBe(false)
  })
})
