import { useRef, type ReactNode } from 'react'
import { updateEquipment } from '../core/equipmentOps'
import { findEquipmentAt, findOpeningAt, findWallAt } from '../core/hitTest'
import type { Point } from '../core/scene'
import { snapPoint, snapToGrid } from '../core/snap'
import { moveWallEndpoint } from '../core/wallOps'
import { selectScene, useEditorStore } from '../stores/editorStore'
import { placementAt } from './equipmentPlacement'
import type { PointerInfo } from './toolTypes'
import { ANGLE_TOLERANCE } from './useWallTool'
import { worldToScreen, type View } from './viewport'

type Drag =
  | { kind: 'endpoint'; wallId: string; which: 'start' | 'end' }
  /** `grab` is the cursor offset from the equipment centre when the drag started. */
  | { kind: 'equipment'; id: string; grab: Point }

const samePoint = (a: Point, b: Point) => a.x === b.x && a.y === b.y

export const SELECT_HINT =
  'Klikni element za urejanje. Vleci napravo ali krajišče izbrane stene. R zasuka napravo, Ctrl+D jo podvoji. Vleci ozadje za pomik.'

/** Select tool: picking elements, dragging wall endpoints and equipment. */
export function useSelectTool(active: boolean) {
  const scene = useEditorStore(selectScene)
  const selection = useEditorStore((s) => s.selection)
  const dragRef = useRef<Drag | null>(null)

  return {
    /** Returns 'drag' (capture the pointer), 'selected', or 'none' (nothing under the cursor). */
    pointerDown(info: PointerInfo): 'drag' | 'selected' | 'none' {
      const { select, beginGesture } = useEditorStore.getState()
      const handle = info.target.closest('[data-handle]')
      if (handle && selection?.kind === 'wall') {
        const which = handle.getAttribute('data-handle') === 'start' ? 'start' : 'end'
        dragRef.current = { kind: 'endpoint', wallId: selection.id, which }
        beginGesture()
        return 'drag'
      }
      const item = findEquipmentAt(scene.equipment, info.world)
      if (item) {
        select({ kind: 'equipment', id: item.id })
        dragRef.current = {
          kind: 'equipment',
          id: item.id,
          grab: { x: info.world.x - item.position.x, y: info.world.y - item.position.y },
        }
        beginGesture()
        return 'drag'
      }
      const opening = findOpeningAt(scene, info.world, info.tolerance)
      if (opening) {
        select({ kind: 'opening', id: opening.id })
        return 'selected'
      }
      const hit = findWallAt(scene.walls, info.world, info.tolerance)
      if (hit) {
        select({ kind: 'wall', id: hit.wall.id })
        return 'selected'
      }
      return 'none'
    },

    /** Returns true while an element is being dragged. */
    pointerMove(info: PointerInfo): boolean {
      const drag = dragRef.current
      if (!drag) return false
      const { preview, history } = useEditorStore.getState()
      const current = history.present

      if (drag.kind === 'endpoint') {
        const wall = current.walls.find((w) => w.id === drag.wallId)
        if (!wall) return true
        const moving = wall[drag.which]
        const other = drag.which === 'start' ? wall.end : wall.start
        const snapped = info.altKey
          ? snapToGrid(info.world, 1)
          : snapPoint(info.world, {
              walls: current.walls.filter(
                (w) => !samePoint(w.start, moving) && !samePoint(w.end, moving),
              ),
              gridSize: current.settings.gridSize,
              endpointTolerance: info.snapDistance,
              angleTolerance: ANGLE_TOLERANCE,
              from: other,
            }).point
        preview((s) => moveWallEndpoint(s, drag.wallId, drag.which, snapped))
        return true
      }

      const item = current.equipment.find((e) => e.id === drag.id)
      if (!item) return true
      const centre = { x: info.world.x - drag.grab.x, y: info.world.y - drag.grab.y }
      const placement = placementAt(item.type, centre, current, {
        snapDistance: info.snapDistance,
        free: info.altKey,
        rotation: item.rotation,
      })
      preview((s) =>
        updateEquipment(s, drag.id, { position: placement.position, rotation: placement.rotation }),
      )
      return true
    },

    pointerUp() {
      if (dragRef.current) useEditorStore.getState().endGesture()
      dragRef.current = null
    },

    renderOverlay(view: View): ReactNode {
      if (!active || selection?.kind !== 'wall') return null
      const wall = scene.walls.find((w) => w.id === selection.id)
      if (!wall) return null
      return (['start', 'end'] as const).map((which) => {
        const p = worldToScreen(view, wall[which])
        return (
          <circle
            key={which}
            data-handle={which}
            className="endpoint-handle"
            cx={p.x}
            cy={p.y}
            r={7}
          />
        )
      })
    },
  }
}
