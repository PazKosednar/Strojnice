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
  it('turns each route segment into a cylinder in metres (plan y -> world -z)', () => {
    const { segments } = pipesTo3d(
      sceneWithPipe([
        { x: 1000, y: 500, z: 300 },
        { x: 2000, y: 500, z: 300 },
        { x: 2000, y: 500, z: 1200 },
      ]),
    )
    expect(segments).toHaveLength(2)
    close(segments[0]!.start, [1, 0.3, -0.5])
    close(segments[0]!.end, [2, 0.3, -0.5])
    close(segments[1]!.end, [2, 1.2, -0.5])
    expect(segments[0]!.radius).toBeCloseTo(0.014)
    expect(segments[0]!.color).toBe('#d62728')
  })

  it('puts a sphere at every bend but not at the ends', () => {
    const { joints } = pipesTo3d(
      sceneWithPipe([
        { x: 0, y: 0, z: 0 },
        { x: 100, y: 0, z: 0 },
        { x: 100, y: 100, z: 0 },
        { x: 100, y: 100, z: 100 },
      ]),
    )
    expect(joints.map((j) => j.key)).toEqual(['p:j1', 'p:j2'])
    close(joints[0]!.center, [0.1, 0, 0])
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
