import { useEffect } from 'react'
import type { Scene } from '../core/scene'
import { useEditorStore } from '../stores/editorStore'
import { applyRouteOutcome, autoPipeIds, pipesNeedingRoute } from './autoRouting'
import { createRoutingClient, type WorkerLike } from './routingClient'

/** Wait after the last change before routing (ms): not on every mouse move. */
export const ROUTE_DEBOUNCE_MS = 500

const createWorker = (): WorkerLike =>
  new Worker(new URL('./routing.worker.ts', import.meta.url), {
    type: 'module',
  }) as unknown as WorkerLike

/**
 * Keeps automatic pipes routed: new pipes and pipes whose equipment moved are routed in
 * the worker after a short pause; results are added to the current undo step. Manual
 * pipes are never touched.
 */
export function useAutoRouting() {
  useEffect(() => {
    const store = useEditorStore.getState
    const client = createRoutingClient({
      createWorker,
      onResult: (pipeId, outcome) => {
        store().amend((scene) => {
          const result = applyRouteOutcome(scene, pipeId, outcome)
          return result ?? { ok: false, error: 'notFound' }
        })
      },
      onProgress: (done, total) => store().setRouting(done, total),
    })

    const pending = new Set<string>()
    let timer: ReturnType<typeof setTimeout> | null = null
    const flush = () => {
      timer = null
      const scene = store().history.present
      // Keep the scene order: earlier pipes are routed first and become obstacles.
      const ids = scene.pipes.filter((p) => pending.has(p.id)).map((p) => p.id)
      pending.clear()
      client.route(scene, ids)
    }
    const schedule = (ms: number) => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(flush, ms)
    }
    const add = (ids: readonly string[], ms = ROUTE_DEBOUNCE_MS) => {
      if (ids.length === 0) return
      ids.forEach((id) => pending.add(id))
      schedule(ms)
    }

    let previous: Scene = store().history.present
    let rerouteRequest = store().rerouteAllRequest
    add(pipesNeedingRoute(null, previous), 0)

    const unsubscribe = useEditorStore.subscribe((state) => {
      if (state.rerouteAllRequest !== rerouteRequest) {
        rerouteRequest = state.rerouteAllRequest
        add(autoPipeIds(state.history.present), 0)
      }
      const scene = state.history.present
      if (scene === previous) return
      const ids = pipesNeedingRoute(previous, scene)
      previous = scene
      add(ids)
    })

    return () => {
      unsubscribe()
      if (timer) clearTimeout(timer)
      client.dispose()
      store().setRouting(0, 0)
    }
  }, [])
}
