import { findWallAt } from '../core/hitTest'
import { addTerminal } from '../core/terminalOps'
import { newId } from '../editor/newId'
import { selectScene, useEditorStore } from '../stores/editorStore'
import type { PointerInfo } from './toolTypes'

/**
 * Wall-terminal tool: a click on a wall places a terminal there, using the system, height
 * and outer diameter the user entered in the terminal form above the plan.
 */
export function useTerminalTool() {
  const scene = useEditorStore(selectScene)
  const draft = useEditorStore((s) => s.terminalDraft)
  const ready = draft.height !== null && draft.outerDiameter !== null && draft.systemId !== ''

  return {
    hint: ready
      ? 'Klikni na steno, kjer cev izstopi iz prostora (izhod na razvod).'
      : 'Najprej zgoraj vnesi sistem, višino in zunanji premer izhoda.',
    pointerDown(info: PointerInfo) {
      const { apply, select, setMessage } = useEditorStore.getState()
      if (!ready || draft.height === null || draft.outerDiameter === null) {
        return setMessage('Najprej vnesi višino in zunanji premer izhoda.')
      }
      const hit = findWallAt(scene.walls, info.world, info.tolerance)
      if (!hit) return setMessage('Klikni na steno.')
      const id = newId()
      const placed = apply((s) =>
        addTerminal(s, {
          id,
          wallId: hit.wall.id,
          offset: Math.round(hit.along),
          height: draft.height!,
          systemId: draft.systemId,
          outerDiameter: draft.outerDiameter!,
        }),
      )
      if (placed) select({ kind: 'terminal', id })
    },
  }
}
