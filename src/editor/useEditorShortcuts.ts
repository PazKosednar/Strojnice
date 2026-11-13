import { useEffect } from 'react'
import { removeEquipment, rotateEquipment } from '../core/equipmentOps'
import { removeObstacle } from '../core/obstacleOps'
import { removeOpening } from '../core/openingOps'
import { removePipe } from '../core/pipeOps'
import { editPipeRoute, removeVertex } from '../core/routeEdit'
import { removeTerminal } from '../core/terminalOps'
import { removeWall } from '../core/wallOps'
import { removeZone } from '../core/zoneOps'
import { useEditorStore } from '../stores/editorStore'
import { duplicateSelected } from './equipmentActions'

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')

/** Ctrl+Z / Ctrl+Y (Ctrl+Shift+Z), Delete, Esc; R and Ctrl+D for the selected equipment. */
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
        const vertex = store.pipeEdit.vertex
        if (kind === 'pipe' && vertex !== null) {
          // Delete removes the selected route vertex, not the whole pipe.
          if (store.apply((s) => editPipeRoute(s, id, (route) => removeVertex(route, vertex)))) {
            store.setPipeEdit({ segment: null, vertex: null })
          }
          return
        }
        store.apply((s) => {
          switch (kind) {
            case 'wall':
              return removeWall(s, id)
            case 'opening':
              return removeOpening(s, id)
            case 'pipe':
              return removePipe(s, id)
            case 'terminal':
              return removeTerminal(s, id)
            case 'obstacle':
              return removeObstacle(s, id)
            case 'zone':
              return removeZone(s, id)
            default:
              return removeEquipment(s, id)
          }
        })
      } else if (mod && key === 'd' && store.selection?.kind === 'equipment') {
        e.preventDefault()
        duplicateSelected(store.selection.id)
      } else if (!mod && !e.altKey && key === 'r' && store.selection?.kind === 'equipment') {
        e.preventDefault()
        const { id } = store.selection
        store.apply((s) => rotateEquipment(s, id, 90))
      } else if (e.key === 'Escape') {
        store.select(null)
        store.setTool('select')
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
