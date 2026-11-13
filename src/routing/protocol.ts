import type { RouteOutcome } from '../core/routing/routePipe'
import type { Scene } from '../core/scene'

/** Main thread -> worker: route these pipes of the scene, in this order. */
export interface RouteRequest {
  jobId: number
  scene: Scene
  pipeIds: string[]
}

/**
 * Worker -> main thread. `progress` after each pipe while the batch is being routed
 * together, then one `result` per pipe, then `done`.
 */
export type RouteMessage =
  | { type: 'progress'; jobId: number; done: number; total: number }
  | { type: 'result'; jobId: number; pipeId: string; outcome: RouteOutcome }
  | { type: 'done'; jobId: number }
