import { useEffect } from 'react'
import { removeOpening } from '../core/openingOps'
import { removeWall } from '../core/wallOps'
import { useEditorStore } from '../stores/editorStore'

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')

/** Ctrl+Z / Ctrl+Y (Ctrl+Shift+Z), Delete and Esc for the editor. */
export function useEditorShortcuts() {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || isTyping(e.target)) return
      const store = useEditorStore.getState()
      const key = e.key.toLowerCase()
      const mod = e.ctrlKey || e.metaKey

      if (mod && key === 'z' && !e.shiftKey) {
        e.preventDefault()
        store.undo()
      } else if (mod && (key === 'y' || (key === 'z' && e.shiftKey))) {
        e.preventDefault()
        store.redo()
      } else if (e.key === 'Delete' && store.selection) {
        e.preventDefault()
        const { kind, id } = store.selection
        store.apply((s) => (kind === 'wall' ? removeWall(s, id) : removeOpening(s, id)))
      } else if (e.key === 'Escape') {
        store.select(null)
        store.setTool('select')
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
