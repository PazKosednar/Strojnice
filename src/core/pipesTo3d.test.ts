import { describe, expect, it } from 'vitest'
import { pipesTo3d, TERMINAL_STUB_OUT, UNKNOWN_PIPE_COLOR } from './pipesTo3d'
import type { Pipe, Scene } from './scene'
import { roomScene } from './testFixtures'

const close = (actual: readonly number[], expected: readonly number[]) =>
  actual.forEach((v, i) => expect(v).toBeCloseTo(expected[i]!, 6))

function sceneWithPipe(route: Pipe['route'], systemId = 'supply'): Scene {
  return {
    ...roomScene(),
    terminals: [
      {
        id: 't1',
        tag: 'IZ-01',
        wallId: 'w2',
        offset: 900,
        height: 300,
        systemId: 'cold',
        outerDiameter: 22,
      },
    ],
    pipes: [
      {
        id: 'p',
        systemId,
        from: { kind: 'terminal', terminalId: 't1' },
        to: { kind: 'terminal', terminalId: 't1' },
        outerDiameter: 28,
        route,
        mode: 'auto',
      },
    ],
  }
}

describe('pipesTo3d', () => {
  it('turns each route segment into a cylinder in metres, shortened for the bends', () => {
    const { segments } = pipesTo3d(
      sceneWithPipe([
        { x: 1000, y: 500, z: 300 },
        { x: 2000, y: 500, z: 300 },
        { x: 2000, y: 500, z: 1200 },
      ]),
    )
    expect(segments).toHaveLength(2)
    // Bend radius 1.5 × 28 mm = 42 mm at the corner.
    close(segments[0]!.start, [1, 0.3, -0.5])
    close(segments[0]!.end, [1.958, 0.3, -0.5])
    close(segments[1]!.start, [2, 0.342, -0.5])
    close(segments[1]!.end, [2, 1.2, -0.5])
    expect(segments[0]!.radius).toBeCloseTo(0.014)
    expect(segments[0]!.color).toBe('#d62728')
  })

  it('draws a quarter-torus elbow at every bend that joins both runs', () => {
    const { elbows, joints, segments } = pipesTo3d(
      sceneWithPipe([
        { x: 0, y: 0, z: 0 },
        { x: 1000, y: 0, z: 0 },
        { x: 1000, y: 1000, z: 0 },
        { x: 1000, y: 1000, z: 1000 },
      ]),
    )
    expect(joints).toEqual([])
    expect(elbows.map((e) => e.key)).toEqual(['p:e1', 'p:e2'])
    const e = elbows[0]!
    const at = (axis: readonly number[]) =>
      e.center.map((c, k) => c + axis[k]! * e.bendRadius) as [number, number, number]
    // The arc starts where the incoming run ends and ends where the outgoing one starts.
    close(at(e.xAxis), segments[0]!.end)
    close(at(e.yAxis), segments[1]!.start)
    expect(e.bendRadius).toBeCloseTo(0.042)
  })

  it('keeps a sphere where the runs are too short for an elbow', () => {
    const { elbows, joints } = pipesTo3d(
      sceneWithPipe([
        { x: 0, y: 0, z: 0 },
        { x: 20, y: 0, z: 0 },
        { x: 20, y: 1000, z: 0 },
      ]),
    )
    expect(elbows).toEqual([])
    expect(joints.map((j) => j.key)).toEqual(['p:j1'])
  })

  it('draws nothing for a pipe without a route and uses grey for unknown systems', () => {
    expect(pipesTo3d(sceneWithPipe([])).segments).toEqual([])
    const unknown = pipesTo3d(
      sceneWithPipe(
        [
          { x: 0, y: 0, z: 0 },
          { x: 100, y: 0, z: 0 },
        ],
        'gone',
      ),
    )
    expect(unknown.segments[0]!.color).toBe(UNKNOWN_PIPE_COLOR)
  })

  it('draws a wall terminal as a stub from the wall axis to beyond the face', () => {
    const { terminals } = pipesTo3d(
      sceneWithPipe([
        { x: 3200, y: 900, z: 300 },
        { x: 2900, y: 900, z: 300 },
      ]),
    )
    expect(terminals).toHaveLength(1)
    // Wall w2 at x = 3200, thickness 200: stub from 3.2 m to 3.2 - (0.1 + stub) m.
    close(terminals[0]!.start, [3.2, 0.3, -0.9])
    close(terminals[0]!.end, [3.2 - (100 + TERMINAL_STUB_OUT) / 1000, 0.3, -0.9])
    expect(terminals[0]!.color).toBe('#2ca02c')
  })
})
