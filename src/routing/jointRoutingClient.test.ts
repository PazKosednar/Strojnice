import { describe, expect, it, vi } from 'vitest'
import { createEmptyScene } from '../core/scene'
import type { JointMessage, JointRequest } from './jointProtocol'
import { createJointRoutingClient, type JointWorkerLike } from './jointRoutingClient'

function fakeWorker() {
  const worker: JointWorkerLike & { sent: JointRequest[]; terminated: boolean } = {
    sent: [],
    terminated: false,
    onmessage: null,
    postMessage(message) {
      this.sent.push(message)
    },
    terminate() {
      this.terminated = true
    },
  }
  const reply = (data: JointMessage) => worker.onmessage?.({ data })
  return { worker, reply }
}

describe('jointRoutingClient', () => {
  it('reports progress and resolves with the result', async () => {
    const { worker, reply } = fakeWorker()
    const client = createJointRoutingClient({
      createWorker: () => worker,
      setTimer: () => 0,
      clearTimer: () => {},
    })
    const progress = vi.fn()
    const running = client.run(createEmptyScene(), ['a', 'b'], progress)
    const jobId = worker.sent[0]!.jobId
    reply({ type: 'progress', jobId, done: 1, total: 2 })
    reply({ type: 'done', jobId, results: [], routes: [] })
    await expect(running).resolves.toMatchObject({ type: 'done' })
    expect(progress.mock.calls).toEqual([
      [0, 2],
      [1, 2],
    ])
    expect(worker.terminated).toBe(true)
  })

  it('cancels: the worker is stopped and the run resolves as cancelled', async () => {
    const { worker } = fakeWorker()
    const client = createJointRoutingClient({
      createWorker: () => worker,
      setTimer: () => 0,
      clearTimer: () => {},
    })
    const running = client.run(createEmptyScene(), ['a'], () => {})
    client.cancel()
    await expect(running).resolves.toEqual({ type: 'cancelled' })
    expect(worker.terminated).toBe(true)
  })

  it('stops a worker that does not answer', async () => {
    const { worker } = fakeWorker()
    let fire: (() => void) | null = null
    const client = createJointRoutingClient({
      createWorker: () => worker,
      setTimer: (cb) => {
        fire = cb
        return 1
      },
      clearTimer: () => {},
    })
    const running = client.run(createEmptyScene(), ['a'], () => {})
    fire!()
    await expect(running).resolves.toEqual({ type: 'cancelled' })
    expect(worker.terminated).toBe(true)
  })
})
