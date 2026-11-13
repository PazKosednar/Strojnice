import { ROUTING_LIMITS } from '../core/routing/costs'
import type { Scene } from '../core/scene'
import type { JointMessage, JointRequest } from './jointProtocol'

/** The part of a Worker the client uses (a fake can stand in for tests). */
export interface JointWorkerLike {
  postMessage(message: JointRequest): void
  terminate(): void
  onmessage: ((event: { data: JointMessage }) => void) | null
}

export type JointOutcome = Extract<JointMessage, { type: 'done' }> | { type: 'cancelled' }

export interface JointRoutingClient {
  /**
   * Routes the pipes together in a worker. Resolves with the result, or 'cancelled' when
   * cancel() was called, a new run started, or the worker stopped answering.
   */
  run(
    scene: Scene,
    pipeIds: readonly string[],
    onProgress: (done: number, total: number) => void,
  ): Promise<JointOutcome>
  cancel(): void
}

export interface JointClientOptions {
  createWorker: () => JointWorkerLike
  /** Longest wait for the next message (ms); then the worker is stopped. */
  watchdogMs?: number
  setTimer?: (callback: () => void, ms: number) => unknown
  clearTimer?: (handle: unknown) => void
}

/** Each pipe gets its own time budget; a rip-up may route a pipe three times. */
const DEFAULT_WATCHDOG_MS = ROUTING_LIMITS.timeBudgetMs * 4 + 5000

export function createJointRoutingClient(options: JointClientOptions): JointRoutingClient {
  const watchdogMs = options.watchdogMs ?? DEFAULT_WATCHDOG_MS
  const setTimer = options.setTimer ?? ((cb, ms) => setTimeout(cb, ms))
  const clearTimer = options.clearTimer ?? ((h) => clearTimeout(h as ReturnType<typeof setTimeout>))

  let worker: JointWorkerLike | null = null
  let jobId = 0
  let timer: unknown = null
  let settle: ((outcome: JointOutcome) => void) | null = null

  const stop = (outcome: JointOutcome) => {
    if (timer !== null) clearTimer(timer)
    timer = null
    const resolve = settle
    settle = null
    resolve?.(outcome)
  }

  const kill = () => {
    worker?.terminate()
    worker = null
  }

  const arm = () => {
    if (timer !== null) clearTimer(timer)
    timer = setTimer(() => {
      kill()
      stop({ type: 'cancelled' })
    }, watchdogMs)
  }

  return {
    run(scene, pipeIds, onProgress) {
      // A running job is abandoned (its worker may be deep in a search).
      kill()
      stop({ type: 'cancelled' })
      jobId += 1
      const id = jobId
      const created = options.createWorker()
      worker = created
      created.onmessage = ({ data }) => {
        if (data.jobId !== id) return
        if (data.type === 'progress') {
          onProgress(data.done, data.total)
          arm()
        } else {
          kill()
          stop(data)
        }
      }
      return new Promise<JointOutcome>((resolve) => {
        settle = resolve
        onProgress(0, pipeIds.length)
        created.postMessage({ jobId: id, scene, pipeIds: [...pipeIds] })
        arm()
      })
    },
    cancel() {
      kill()
      stop({ type: 'cancelled' })
    },
  }
}
