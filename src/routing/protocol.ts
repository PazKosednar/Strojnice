import type { RouteOutcome } from '../core/routing/routePipe'
import type { Scene } from '../core/scene'

/** Main thread -> worker: route these pipes of the scene, in this order. */
export interface RouteRequest {
  jobId: number
  scene: Scene
  pipeIds: string[]
}

/** Worker -> main thread. One `result` per pipe, then `done`. */
export type RouteMessage =
  | { type: 'result'; jobId: number; pipeId: string; outcome: RouteOutcome }
  | { type: 'done'; jobId: number }
