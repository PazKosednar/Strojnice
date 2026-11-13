import type { BatchResult } from '../core/routing/routeAll'
import type { RoutePoint, Scene } from '../core/scene'

/** Main thread -> joint routing worker. */
export interface JointRequest {
  jobId: number
  scene: Scene
  pipeIds: string[]
}

/** Joint routing worker -> main thread: progress after each pipe, then the result. */
export type JointMessage =
  | { type: 'progress'; jobId: number; done: number; total: number }
  | {
      type: 'done'
      jobId: number
      results: BatchResult[]
      /** Final route of every pipe of the batch (empty when it failed). */
      routes: { pipeId: string; route: RoutePoint[] }[]
    }
