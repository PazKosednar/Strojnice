import { describe, expect, it } from 'vitest'
import type { RouteOutcome } from '../core/routing/routePipe'
import { createEmptyScene } from '../core/scene'
import type { RouteMessage, RouteRequest } from './protocol'
import { createRoutingClient, type WorkerLike } from './routingClient'

class FakeWorker implements WorkerLike {
  onmessage: ((event: { data: RouteMessage }) => void) | null = null
  requests: RouteRequest[] = []
  terminated = false
  postMessage(message: RouteRequest) {
    this.requests.push(message)
  }
  terminate() {
    this.terminated = true
  }
  reply(message: RouteMessage) {
    this.onmessage?.({ data: message })
  }
}

const ok: RouteOutcome = { ok: true, route: [], length: 0, bends: 0, crossings: [], gridStep: 50 }

function setup() {
  const workers: FakeWorker[] = []
  const timers: { cb: () => void; ms: number }[] = []
  const results: [string, RouteOutcome][] = []
  const progress: [number, number][] = []
  const client = createRoutingClient({
    createWorker: () => {
      const w = new FakeWorker()
      workers.push(w)
      return w
    },
    onResult: (id, outcome) => results.push([id, outcome]),
    onProgress: (done, total) => progress.push([done, total]),
    watchdogMs: 5000,
    setTimer: (cb, ms) => {
      timers.push({ cb, ms })
      return timers.length - 1
    },
    clearTimer: (h) => {
      timers[h as number] = { cb: () => {}, ms: -1 }
    },
  })
  return { client, workers, timers, results, progress }
}

describe('routingClient', () => {
  it('sends a job and reports results and progress', () => {
    const { client, workers, results, progress } = setup()
    client.route(createEmptyScene(), ['a', 'b'])
    const job = workers[0]!.requests[0]!
    expect(job.pipeIds).toEqual(['a', 'b'])
    workers[0]!.reply({ type: 'result', jobId: job.jobId, pipeId: 'a', outcome: ok })
    workers[0]!.reply({ type: 'result', jobId: job.jobId, pipeId: 'b', outcome: ok })
    workers[0]!.reply({ type: 'done', jobId: job.jobId })
    expect(results.map(([id]) => id)).toEqual(['a', 'b'])
    expect(progress).toEqual([
      [0, 2],
      [1, 2],
      [2, 2],
      [0, 0],
    ])
  })

  it('replaces a running job: the busy worker is terminated and late results ignored', () => {
    const { client, workers, results } = setup()
    client.route(createEmptyScene(), ['a'])
    const first = workers[0]!
    client.route(createEmptyScene(), ['b'])
    expect(first.terminated).toBe(true)
    first.reply({ type: 'result', jobId: first.requests[0]!.jobId, pipeId: 'a', outcome: ok })
    const second = workers[1]!
    second.reply({ type: 'result', jobId: second.requests[0]!.jobId, pipeId: 'b', outcome: ok })
    expect(results.map(([id]) => id)).toEqual(['b'])
  })

  it('reuses an idle worker', () => {
    const { client, workers } = setup()
    client.route(createEmptyScene(), ['a'])
    workers[0]!.reply({ type: 'done', jobId: workers[0]!.requests[0]!.jobId })
    client.route(createEmptyScene(), ['b'])
    expect(workers).toHaveLength(1)
    expect(workers[0]!.terminated).toBe(false)
  })

  it('replaces a hanging worker and reports the remaining pipes as timed out', () => {
    const { client, workers, timers, results } = setup()
    client.route(createEmptyScene(), ['a', 'b'])
    const job = workers[0]!.requests[0]!
    workers[0]!.reply({ type: 'result', jobId: job.jobId, pipeId: 'a', outcome: ok })
    timers[timers.length - 1]!.cb()
    expect(workers[0]!.terminated).toBe(true)
    expect(results).toEqual([
      ['a', ok],
      ['b', { ok: false, reason: 'timeout' }],
    ])
    client.route(createEmptyScene(), ['c'])
    expect(workers).toHaveLength(2)
  })

  it('ignores empty requests', () => {
    const { client, workers } = setup()
    client.route(createEmptyScene(), [])
    expect(workers).toHaveLength(0)
  })

  it('keeps a stable order of pipes in the job', () => {
    const { client, workers } = setup()
    client.route(createEmptyScene(), ['z', 'a', 'm'])
    expect(workers[0]!.requests[0]!.pipeIds).toEqual(['z', 'a', 'm'])
  })
})
