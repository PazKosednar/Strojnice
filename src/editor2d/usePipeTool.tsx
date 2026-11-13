import { useEffect, useState } from 'react'
import { endDiameter, endLabel, resolveEnd } from '../core/pipeEnds'
import { findEndsAt } from '../core/pipeHitTest'
import { addPipe, checkConnection } from '../core/pipeOps'
import type { PipeEnd } from '../core/scene'
import { newId } from '../editor/newId'
import { selectScene, useEditorStore } from '../stores/editorStore'
import { connectionRejection } from './connectMessage'
import { pickEnd } from './pickEnd'
import { isTyping, type PointerInfo } from './toolTypes'

/** Pick distance around ports and terminals (screen px). */
const END_PICK_PX = 10

/**
 * Pipe tool: click a port or wall terminal, then a second one of the same system.
 * While the first end is picked, valid targets are highlighted. Where several ports lie
 * above each other, the matching one is chosen; clicking the picked spot again switches
 * to the next port there. Esc cancels.
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

  const label = (end: PipeEnd | null) => {
    const resolved = end && resolveEnd(scene, end)
    return resolved ? endLabel(resolved) : null
  }

  return {
    source,
    hint: source
      ? `Izbran je ${label(source)}. Klikni poudarjen priključek ali izhod istega sistema (ponoven klik na isto mesto izbere naslednji priključek tam). Esc prekliče.`
      : 'Klikni priključek naprave ali izhod v steni, nato drugi konec istega sistema.',
    pointerDown(info: PointerInfo, scale: number) {
      const { apply, select, setMessage } = useEditorStore.getState()
      const candidates = findEndsAt(scene, info.world, END_PICK_PX / scale)
      const pick = pickEnd(scene, candidates, source)
      if (pick.kind === 'none') {
        return setMessage('Klikni na priključek naprave ali na izhod v steni.')
      }
      const resolved = resolveEnd(scene, pick.end)
      if (!resolved) return

      if (resolved.kind === 'port' && endDiameter(resolved) === undefined) {
        // Shortcut to fixing it: select the equipment, whose panel has the diameter fields.
        select({ kind: 'equipment', id: resolved.equipment.id })
        setMessage(
          `Priključek ${endLabel(resolved)} nima vnesenega zunanjega premera cevi. Vnesi ga v lastnostih naprave (desno).`,
        )
        return
      }
      if (pick.kind === 'source') {
        setSource(pick.end)
        setMessage(null)
        return
      }
      const from = source!
      const check = checkConnection(scene, from, pick.end)
      if (!check.ok) return setMessage(connectionRejection(scene, from, candidates))
      const id = newId()
      if (apply((s) => addPipe(s, { id, from, to: pick.end }))) {
        setSource(null)
        select({ kind: 'pipe', id })
      }
    },
  }
}
