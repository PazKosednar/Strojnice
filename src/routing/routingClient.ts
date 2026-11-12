import type { RouteOutcome } from '../core/routing/routePipe'
import type { Scene } from '../core/scene'
import type { RouteMessage, RouteRequest } from './protocol'

/** The part of a Worker the client uses (a fake can stand in for tests). */
export interface WorkerLike {
  postMessage(message: RouteRequest): void
  terminate(): void
  onmessage: ((event: { data: RouteMessage }) => void) | null
}

export interface RoutingClientOptions {
  createWorker: () => WorkerLike
  onResult: (pipeId: string, outcome: RouteOutcome) => void
  /** Progress: `done` of `total` pipes of the current job; total 0 = idle. */
  onProgress: (done: number, total: number) => void
  /**
   * Longest wait for the next message from the worker (ms). The worker limits each pipe
   * to its own time budget; this is the safety net if it hangs anyway.
   */
  watchdogMs?: number
  setTimer?: (callback: () => void, ms: number) => unknown
  clearTimer?: (handle: unknown) => void
}

export interface RoutingClient {
  /** Routes these pipes; a running job is cancelled (its late results are ignored). */
  route(scene: Scene, pipeIds: readonly string[]): void
  dispose(): void
}

/**
 * Runs routing jobs in a worker, one at a time. A new job replaces the running one: the
 * busy worker is terminated and a fresh one started, so results always belong to the
 * latest request. If the worker stops answering, it is replaced and the remaining pipes
 * are reported as timed out.
 */
export function createRoutingClient(options: RoutingClientOptions): RoutingClient {
  const watchdogMs = options.watchdogMs ?? 5000
  const setTimer = options.setTimer ?? ((cb, ms) => setTimeout(cb, ms))
  const clearTimer = options.clearTimer ?? ((h) => clearTimeout(h as ReturnType<typeof setTimeout>))

  let worker: WorkerLike | null = null
  let jobId = 0
  let busy = false
  let remaining: string[] = []
  let total = 0
  let timer: unknown = null

  const stopTimer = () => {
    if (timer !== null) clearTimer(timer)
    timer = null
  }

  const finish = () => {
    stopTimer()
    busy = false
    remaining = []
    total = 0
    options.onProgress(0, 0)
  }

  const armWatchdog = () => {
    stopTimer()
    timer = setTimer(() => {
      // The worker hangs: replace it and report what is left as timed out.
      worker?.terminate()
      worker = null
      const left = remaining
      finish()
      for (const id of left) options.onResult(id, { ok: false, reason: 'timeout' })
    }, watchdogMs)
  }

  const ensureWorker = (): WorkerLike => {
    if (worker) return worker
    const created = options.createWorker()
    created.onmessage = ({ data }) => {
      if (data.jobId !== jobId) return
      if (data.type === 'result') {
        remaining = remaining.filter((id) => id !== data.pipeId)
        options.onResult(data.pipeId, data.outcome)
        options.onProgress(total - remaining.length, total)
        armWatchdog()
      } else {
        finish()
      }
    }
    worker = created
    return created
  }

  return {
    route(scene, pipeIds) {
      if (pipeIds.length === 0) return
      if (busy) {
        // Abandon the running job; its worker may be deep in a search.
        worker?.terminate()
        worker = null
      }
      jobId += 1
      busy = true
      remaining = [...pipeIds]
      total = pipeIds.length
      options.onProgress(0, total)
      ensureWorker().postMessage({ jobId, scene, pipeIds: [...pipeIds] })
      armWatchdog()
    },
    dispose() {
      stopTimer()
      worker?.terminate()
      worker = null
    },
  }
}
