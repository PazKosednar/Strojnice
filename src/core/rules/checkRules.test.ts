import { describe, expect, it } from 'vitest'
import type { Obstacle, Pipe, Point3, RoutingRule, Scene } from '../scene'
import { roomScene } from '../testFixtures'
import { checkRules } from './checkRules'
import { segmentBoxDistance, segmentDistance, segmentsOutsidePortStubs } from './geometry'

const P = (x: number, y: number, z: number): Point3 => ({ x, y, z })

function pipe(id: string, systemId: string, route: Point3[], patch: Partial<Pipe> = {}): Pipe {
  return {
    id,
    systemId,
    from: { kind: 'terminal', terminalId: `${id}-a` },
    to: { kind: 'terminal', terminalId: `${id}-b` },
    outerDiameter: 22,
    route,
    mode: 'manual',
    ...patch,
  }
}

const base = { active: true, source: 'test', hard: true }

function sceneWith(pipes: Pipe[], rules: RoutingRule[], patch: Partial<Scene> = {}): Scene {
  return { ...roomScene(), pipes, rules, ...patch }
}

const cabinet: Obstacle = {
  id: 'o1',
  tag: 'OV-01',
  name: 'El. omarica',
  category: 'electrical',
  center: { x: 1600, y: 1600 },
  width: 600,
  depth: 200,
  rotation: 0,
  bottom: 500,
  height: 1000,
}

describe('geometry', () => {
  it('measures the distance between axis-parallel segments exactly', () => {
    const s = { a: P(0, 0, 0), b: P(1000, 0, 0), index: 0 }
    const t = { a: P(500, 300, 400), b: P(500, 300, 900), index: 0 }
    expect(segmentDistance(s, t)).toEqual({ distance: 500, point: P(500, 0, 0) })
  })

  it('measures the distance from a segment to a rotated box', () => {
    const s = { a: P(0, 0, 1000), b: P(3000, 0, 1000), index: 0 }
    const box = { ...cabinet, center: { x: 1000, y: 400 }, rotation: 90 }
    // Turned by 90°: depth 200 lies along x, width 600 along y -> near face at y = 100.
    const { distance } = segmentBoxDistance(s, box)
    expect(distance).toBeCloseTo(100, 6)
  })

  it('drops the fixed straight runs at ports', () => {
    const scene = roomScene()
    const p = pipe('p', 'supply', [P(0, 0, 100), P(0, 0, 500), P(1000, 0, 500)], {
      from: { kind: 'port', equipmentId: 'e', portId: 'a' },
    })
    const segments = segmentsOutsidePortStubs(scene, p)
    expect(segments[0]!.a).toEqual(P(0, 0, 100 + scene.settings.portStraight))
  })
})

describe('checkRules', () => {
  it('reports nothing for rules without a source or value', () => {
    const scene = sceneWith(
      [pipe('a', 'cold', [P(1000, 1200, 1000), P(2000, 1200, 1000)])],
      [
        {
          ...base,
          source: '',
          id: 'r',
          kind: 'obstacleDistance',
          systemId: 'cold',
          category: 'electrical',
          distance: 500,
        },
        {
          ...base,
          id: 'r2',
          kind: 'obstacleDistance',
          systemId: 'cold',
          category: 'electrical',
          distance: null,
        },
      ],
      { obstacles: [cabinet] },
    )
    expect(checkRules(scene)).toEqual([])
  })

  it('obstacleDistance: measured and required gap, with the source', () => {
    // Pipe axis at y = 1300, cabinet face at y = 1500: centre distance 200, gap 200 - 11.
    const rule: RoutingRule = {
      ...base,
      id: 'r',
      kind: 'obstacleDistance',
      systemId: 'cold',
      category: 'electrical',
      distance: 300,
    }
    const scene = sceneWith(
      [pipe('a', 'cold', [P(1000, 1300, 1000), P(2000, 1300, 1000)])],
      [rule],
      { obstacles: [cabinet] },
    )
    expect(checkRules(scene)).toEqual([
      {
        ruleId: 'r',
        kind: 'obstacleDistance',
        hard: true,
        source: 'test',
        pipeIds: ['a'],
        point: P(1600, 1300, 1000),
        measured: 189,
        required: 300,
        obstacleId: 'o1',
      },
    ])
    // Other systems and other categories are not affected.
    const supply = sceneWith(
      [pipe('a', 'supply', [P(1000, 1300, 1000), P(2000, 1300, 1000)])],
      [rule],
      { obstacles: [cabinet] },
    )
    expect(checkRules(supply)).toEqual([])
    const duct = sceneWith(scene.pipes, [rule], {
      obstacles: [{ ...cabinet, category: 'duct' }],
    })
    expect(checkRules(duct)).toEqual([])
  })

  it('obstacleDistance counts the insulation', () => {
    const rule: RoutingRule = {
      ...base,
      id: 'r',
      kind: 'obstacleDistance',
      systemId: null,
      category: 'electrical',
      distance: 180,
    }
    const pipes = [pipe('a', 'cold', [P(1000, 1300, 1000), P(2000, 1300, 1000)])]
    const scene = sceneWith(pipes, [rule], { obstacles: [cabinet] })
    expect(checkRules(scene)).toEqual([])
    const insulated = {
      ...scene,
      settings: {
        ...scene.settings,
        systems: scene.settings.systems.map((s) =>
          s.id === 'cold' ? { ...s, insulationThickness: 20 } : s,
        ),
      },
    }
    expect(checkRules(insulated)).toMatchObject([{ measured: 169, required: 180 }])
  })

  it('minSpacing: between the named systems (either order), surface to surface', () => {
    const rule: RoutingRule = {
      ...base,
      id: 'r',
      kind: 'minSpacing',
      systemA: 'supply',
      systemB: 'return',
      distance: 50,
    }
    const pipes = [
      pipe('s', 'supply', [P(500, 800, 2000), P(2500, 800, 2000)]),
      pipe('r', 'return', [P(500, 860, 2000), P(2500, 860, 2000)]),
      pipe('c', 'cold', [P(500, 900, 2000), P(2500, 900, 2000)]),
    ]
    expect(checkRules(sceneWith(pipes, [rule]))).toMatchObject([
      { pipeIds: ['s', 'r'], measured: 38, required: 50, point: P(1500, 800, 2000) },
    ])
    // s-c: 100 mm between axes = 78 mm clear, enough; r-c: 40 - 22 = 18 mm.
    const all = { ...rule, systemA: null, systemB: null }
    expect(checkRules(sceneWith(pipes, [all])).map((v) => v.pipeIds)).toEqual([
      ['s', 'r'],
      ['r', 'c'],
    ])
  })

  it('verticalOrder: upper must be higher where runs are side by side', () => {
    const rule: RoutingRule = {
      ...base,
      id: 'r',
      kind: 'verticalOrder',
      upper: 'supply',
      lower: 'return',
      parallelWithin: 300,
    }
    const wrong = [
      pipe('s', 'supply', [P(500, 800, 2000), P(2500, 800, 2000)]),
      pipe('r', 'return', [P(1000, 900, 2200), P(3000, 900, 2200)]),
    ]
    expect(checkRules(sceneWith(wrong, [rule]))).toMatchObject([
      { pipeIds: ['s', 'r'], measured: -200, required: 0, point: P(1750, 800, 2000) },
    ])
    // Same height side by side is also not "above".
    const level = [wrong[0]!, pipe('r', 'return', [P(1000, 900, 2000), P(3000, 900, 2000)])]
    expect(checkRules(sceneWith(level, [rule]))).toMatchObject([{ measured: 0 }])
    // Right order, too far apart, or not overlapping: fine.
    const right = [wrong[0]!, pipe('r', 'return', [P(1000, 900, 1800), P(3000, 900, 1800)])]
    const far = [wrong[0]!, pipe('r', 'return', [P(1000, 1200, 2200), P(3000, 1200, 2200)])]
    const apart = [wrong[0]!, pipe('r', 'return', [P(2600, 900, 2200), P(3000, 900, 2200)])]
    for (const pipes of [right, far, apart])
      expect(checkRules(sceneWith(pipes, [rule]))).toEqual([])
  })

  it('heightRange: horizontal runs outside the range, lowest and highest', () => {
    const rule: RoutingRule = {
      ...base,
      id: 'r',
      kind: 'heightRange',
      systemId: 'cold',
      min: 2000,
      max: 2400,
    }
    const p = pipe('a', 'cold', [
      P(500, 500, 1500),
      P(1000, 500, 1500),
      P(1000, 500, 2500),
      P(2000, 500, 2500),
    ])
    expect(checkRules(sceneWith([p], [rule]))).toMatchObject([
      { bound: 'min', measured: 1500, required: 2000, point: P(750, 500, 1500) },
      { bound: 'max', measured: 2500, required: 2400, point: P(1500, 500, 2500) },
    ])
  })

  it('noCrossing: tells doors, windows and walls apart', () => {
    const scene = roomScene()
    const wall = scene.walls[0]! // from (0,0) to (3200,0)
    const withDoor: Scene = {
      ...scene,
      openings: [
        {
          id: 'd',
          wallId: wall.id,
          type: 'door',
          offset: 1000,
          width: 900,
          height: 2100,
          sillHeight: 0,
        },
      ],
    }
    const through = (x: number) => pipe(`p${x}`, 'cold', [P(x, 500, 1000), P(x, -500, 1000)])
    const doorRule: RoutingRule = {
      ...base,
      id: 'r',
      kind: 'noCrossing',
      systemId: null,
      element: 'door',
    }
    const wallRule: RoutingRule = { ...doorRule, id: 'w', element: 'wall' }
    const result = checkRules({
      ...withDoor,
      pipes: [through(1400), through(2500)],
      rules: [doorRule, wallRule],
    })
    expect(result.map((v) => [v.ruleId, v.pipeIds[0], v.crossing?.element])).toEqual([
      ['r', 'p1400', 'door'],
      ['w', 'p2500', 'wall'],
    ])
  })

  it('maxBends: always a warning, at the first bend over the limit', () => {
    const rule: RoutingRule = { ...base, id: 'r', kind: 'maxBends', systemId: null, max: 1 }
    const p = pipe('a', 'cold', [P(0, 0, 0), P(100, 0, 0), P(100, 100, 0), P(200, 100, 0)])
    expect(checkRules(sceneWith([p], [rule]))).toMatchObject([
      { hard: false, measured: 2, required: 1, point: P(100, 100, 0) },
    ])
  })

  it('checks manual and automatic pipes alike and skips pipes without a route', () => {
    const rule: RoutingRule = { ...base, id: 'r', kind: 'maxBends', systemId: null, max: 0 }
    const bent = [P(0, 0, 0), P(100, 0, 0), P(100, 100, 0)]
    const pipes = [
      pipe('m', 'cold', bent),
      pipe('a', 'cold', bent, { mode: 'auto' }),
      pipe('n', 'cold', [], { mode: 'auto' }),
    ]
    expect(checkRules(sceneWith(pipes, [rule])).map((v) => v.pipeIds[0])).toEqual(['m', 'a'])
  })
})
