/// <reference lib="webworker" />
// Web Worker for joint routing ("Samodejno poveži in spelji"), off the main thread.
import { routeAll } from '../core/routing/routeAll'
import type { JointMessage, JointRequest } from './jointProtocol'

const post = (message: JointMessage) => self.postMessage(message)

self.onmessage = (event: MessageEvent<JointRequest>) => {
  const { jobId, scene, pipeIds } = event.data
  const { scene: done, results } = routeAll(scene, pipeIds, {
    onProgress: (count, total) => post({ type: 'progress', jobId, done: count, total }),
  })
  const routes = pipeIds.map((pipeId) => ({
    pipeId,
    route: done.pipes.find((p) => p.id === pipeId)?.route ?? [],
  }))
  post({ type: 'done', jobId, results, routes })
}
