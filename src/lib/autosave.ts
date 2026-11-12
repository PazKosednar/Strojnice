export type SaveStatus = 'saved' | 'pending' | 'saving' | 'error'

export interface AutosaveOptions<T> {
  save: (value: T) => Promise<void>
  onStatus: (status: SaveStatus) => void
  /** Delay after the last change before saving (ms). */
  debounceMs?: number
  /** First retry delay after a failed save (ms); doubles up to `maxRetryMs`. */
  retryMs?: number
  maxRetryMs?: number
}

export interface Autosave<T> {
  /** Schedules saving of the latest value. */
  change: (value: T) => void
  /** Saves immediately if there are unsaved changes. */
  flush: () => Promise<void>
  /** True while there are changes not yet confirmed by the server. */
  hasUnsavedChanges: () => boolean
  dispose: () => void
}

/**
 * Debounced saving with retry. Changes made while a save is in flight are saved
 * afterwards; on failure the latest value is kept and retried with backoff.
 */
export function createAutosave<T>(options: AutosaveOptions<T>): Autosave<T> {
  const debounceMs = options.debounceMs ?? 1000
  const retryMs = options.retryMs ?? 2000
  const maxRetryMs = options.maxRetryMs ?? 30000

  let latest: { value: T } | null = null
  let timer: ReturnType<typeof setTimeout> | null = null
  let saving = false
  let nextRetry = retryMs
  let disposed = false

  const schedule = (ms: number) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => void run(), ms)
  }

  const run = async () => {
    timer = null
    if (saving || !latest || disposed) return
    const pending = latest
    saving = true
    options.onStatus('saving')
    try {
      await options.save(pending.value)
      if (latest === pending) latest = null
      nextRetry = retryMs
      saving = false
      if (disposed) return
      if (latest) {
        options.onStatus('pending')
        schedule(debounceMs)
      } else {
        options.onStatus('saved')
      }
    } catch {
      saving = false
      if (disposed) return
      options.onStatus('error')
      schedule(nextRetry)
      nextRetry = Math.min(nextRetry * 2, maxRetryMs)
    }
  }

  return {
    change(value) {
      latest = { value }
      if (saving) return
      options.onStatus('pending')
      schedule(debounceMs)
    },
    async flush() {
      if (timer) clearTimeout(timer)
      await run()
    },
    hasUnsavedChanges: () => latest !== null,
    dispose() {
      disposed = true
      if (timer) clearTimeout(timer)
    },
  }
}
