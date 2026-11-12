import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createAutosave, type SaveStatus } from './autosave'

describe('createAutosave', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  function setup(save: (v: string) => Promise<void>) {
    const statuses: SaveStatus[] = []
    const autosave = createAutosave({
      save,
      onStatus: (s) => statuses.push(s),
      debounceMs: 1000,
      retryMs: 2000,
      maxRetryMs: 8000,
    })
    return { autosave, statuses }
  }

  it('saves only the latest value after the debounce delay', async () => {
    const save = vi.fn().mockResolvedValue(undefined)
    const { autosave, statuses } = setup(save)
    autosave.change('a')
    autosave.change('b')
    await vi.advanceTimersByTimeAsync(999)
    expect(save).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(save).toHaveBeenCalledTimes(1)
    expect(save).toHaveBeenCalledWith('b')
    expect(statuses.at(-1)).toBe('saved')
    expect(autosave.hasUnsavedChanges()).toBe(false)
  })

  it('retries a failed save with increasing delay and keeps the changes', async () => {
    const save = vi
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue(undefined)
    const { autosave, statuses } = setup(save)
    autosave.change('a')
    await vi.advanceTimersByTimeAsync(1000)
    expect(statuses.at(-1)).toBe('error')
    expect(autosave.hasUnsavedChanges()).toBe(true)

    await vi.advanceTimersByTimeAsync(2000)
    expect(save).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(3999)
    expect(save).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(1)
    expect(save).toHaveBeenCalledTimes(3)
    expect(save).toHaveBeenLastCalledWith('a')
    expect(statuses.at(-1)).toBe('saved')
  })

  it('saves changes made during an in-flight save afterwards', async () => {
    let finish!: () => void
    const save = vi
      .fn()
      .mockImplementationOnce(() => new Promise<void>((r) => (finish = r)))
      .mockResolvedValue(undefined)
    const { autosave } = setup(save)
    autosave.change('a')
    await vi.advanceTimersByTimeAsync(1000)
    autosave.change('b')
    finish()
    await vi.advanceTimersByTimeAsync(1000)
    expect(save).toHaveBeenCalledTimes(2)
    expect(save).toHaveBeenLastCalledWith('b')
    expect(autosave.hasUnsavedChanges()).toBe(false)
  })

  it('flush saves immediately', async () => {
    const save = vi.fn().mockResolvedValue(undefined)
    const { autosave } = setup(save)
    autosave.change('a')
    await autosave.flush()
    expect(save).toHaveBeenCalledWith('a')
  })

  it('stops after dispose', async () => {
    const save = vi.fn().mockResolvedValue(undefined)
    const { autosave } = setup(save)
    autosave.change('a')
    autosave.dispose()
    await vi.advanceTimersByTimeAsync(5000)
    expect(save).not.toHaveBeenCalled()
  })
})
