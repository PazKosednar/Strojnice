import { useEffect, useState } from 'react'
import { findEndAt } from '../core/pipeHitTest'
import { addPipe, checkConnection } from '../core/pipeOps'
import { endDiameter, endLabel, resolveEnd } from '../core/pipeEnds'
import type { PipeEnd } from '../core/scene'
import { newId } from '../editor/newId'
import { sceneErrorMessage } from '../editor/sceneErrorMessages'
import { selectScene, useEditorStore } from '../stores/editorStore'
import { isTyping, type PointerInfo } from './toolTypes'

/** Pick distance around ports and terminals (screen px). */
const END_PICK_PX = 10

/**
 * Pipe tool: click a port or wall terminal, then a second one of the same system.
 * While the first end is picked, valid targets are highlighted. Esc cancels.
 */
export function usePipeTool(active: boolean) {
  const scene = useEditorStore(selectScene)
  const [source, setSource] = useState<PipeEnd | null>(null)

  const [wasActive, setWasActive] = useState(active)
  if (wasActive !== active) {
    setWasActive(active)
    setSource(null)
  }

  useEffect(() => {
    if (!active || !source) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || isTyping(e.target)) return
      e.preventDefault()
      setSource(null)
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [active, source])

  const sourceLabel = (() => {
    const resolved = source && resolveEnd(scene, source)
    return resolved ? endLabel(resolved) : null
  })()

  return {
    source,
    hint: source
      ? `Izbran je ${sourceLabel}. Klikni poudarjen priključek ali izhod istega sistema. Esc prekliče.`
      : 'Klikni priključek naprave ali izhod v steni, nato drugi konec istega sistema.',
    pointerDown(info: PointerInfo, scale: number) {
      const { apply, select, setMessage } = useEditorStore.getState()
      const end = findEndAt(scene, info.world, END_PICK_PX / scale)
      if (!end) return setMessage('Klikni na priključek naprave ali na izhod v steni.')
      const resolved = resolveEnd(scene, end)
      if (!resolved) return

      if (endDiameter(resolved) === undefined && resolved.kind === 'port') {
        // Shortcut to fixing it: select the equipment, whose panel has the diameter fields.
        select({ kind: 'equipment', id: resolved.equipment.id })
        setMessage(
          `Priključek ${endLabel(resolved)} nima vnesenega zunanjega premera cevi. Vnesi ga v lastnostih naprave (desno).`,
        )
        return
      }
      if (!source) {
        setSource(end)
        setMessage(null)
        return
      }
      const check = checkConnection(scene, source, end)
      if (!check.ok) {
        if (check.error === 'pipeSameEnd') return setSource(null)
        return setMessage(sceneErrorMessage(check.error))
      }
      const id = newId()
      if (apply((s) => addPipe(s, { id, from: source, to: end }))) {
        setSource(null)
        select({ kind: 'pipe', id })
      }
    },
  }
}
