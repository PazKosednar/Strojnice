import { useEffect, useState, type RefObject } from 'react'

export interface Size {
  width: number
  height: number
}

/** Tracks an element's content size (null until measured). */
export function useElementSize(ref: RefObject<HTMLElement | null>): Size | null {
  const [size, setSize] = useState<Size | null>(null)
  useEffect(() => {
    const element = ref.current
    if (!element || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return
      const { width, height } = entry.contentRect
      setSize((prev) =>
        prev && prev.width === width && prev.height === height ? prev : { width, height },
      )
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref])
  return size
}
