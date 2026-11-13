/// <reference lib="webworker" />
// Web Worker: runs pipe routing off the main thread so the editor never freezes.
import { routeAll } from '../core/routing/routeAll'
import type { RouteMessage, RouteRequest } from './protocol'

const post = (message: RouteMessage) => self.postMessage(message)

self.onmessage = (event: MessageEvent<RouteRequest>) => {
  const { jobId, scene, pipeIds } = event.data
  // Routed together (circuit pairs side by side, rip-up when a pipe is closed off); the
  // final routes are reported at the end, because a later pipe may move an earlier one.
  const { scene: done, results } = routeAll(scene, pipeIds, {
    onProgress: (count, total) => post({ type: 'progress', jobId, done: count, total }),
  })
  for (const { pipeId, outcome } of results) {
    const route = done.pipes.find((p) => p.id === pipeId)?.route ?? []
    post({
      type: 'result',
      jobId,
      pipeId,
      outcome: outcome.ok ? { ...outcome, route } : outcome,
    })
  }
  post({ type: 'done', jobId })
}
