/// <reference lib="webworker" />
// Web Worker: runs pipe routing off the main thread so the editor never freezes.
import type { RouteMessage, RouteRequest } from './protocol'
import { routeBatch } from './routeBatch'

const post = (message: RouteMessage) => self.postMessage(message)

self.onmessage = (event: MessageEvent<RouteRequest>) => {
  const { jobId, scene, pipeIds } = event.data
  routeBatch(scene, pipeIds, (pipeId, outcome) => post({ type: 'result', jobId, pipeId, outcome }))
  post({ type: 'done', jobId })
}
