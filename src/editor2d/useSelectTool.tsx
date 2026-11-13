import { useRef, type ReactNode } from 'react'
import { updateEquipment } from '../core/equipmentOps'
import { findEquipmentAt, findOpeningAt, findWallAt } from '../core/hitTest'
import { findEndAt, findPipeAt, findVertexAt } from '../core/pipeHitTest'
import { editPipeRoute, insertVertex, moveSegment, segmentAxis, type Axis } from '../core/routeEdit'
import type { Point, RoutePoint } from '../core/scene'
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
  /** Moving a pipe segment perpendicular to itself, from its route at drag start. */
  | {
      kind: 'segment'
      pipeId: string
      segment: number
      /** Plan axis the segment moves along (perpendicular to it). */
      axis: Extract<Axis, 'x' | 'y'>
      from: Point
      route: RoutePoint[]
    }

const samePoint = (a: Point, b: Point) => a.x === b.x && a.y === b.y

export const SELECT_HINT =
  'Klikni element za urejanje. Vleci napravo, krajišče stene ali odsek cevi. Dvoklik na cev doda lom. R zasuka napravo, Ctrl+D jo podvoji.'

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
      const vertex = info.target.closest('[data-vertex]')
      if (vertex && selection?.kind === 'pipe') {
        const index = Number(vertex.getAttribute('data-vertex'))
        useEditorStore.getState().setPipeEdit({ segment: null, vertex: index })
        return 'selected'
      }
      const end = findEndAt(scene, info.world, info.tolerance * 1.5)
      if (end?.kind === 'terminal') {
        select({ kind: 'terminal', id: end.terminalId })
        return 'selected'
      }
      const { hiddenSystems, setPipeEdit } = useEditorStore.getState()
      const pipeHit = findPipeAt(scene, info.world, info.tolerance, hiddenSystems)
      const item = findEquipmentAt(scene.equipment, info.world)
      // A pipe drawn over equipment (e.g. along its top) is picked before the equipment.
      if (pipeHit && (!item || pipeHit.pipe.route.length > 0)) {
        const { pipe, segment } = pipeHit
        select({ kind: 'pipe', id: pipe.id })
        setPipeEdit({ segment, vertex: null })
        const own = segmentAxis(pipe.route[segment]!, pipe.route[segment + 1]!)
        if (own === 'x' || own === 'y') {
          dragRef.current = {
            kind: 'segment',
            pipeId: pipe.id,
            segment,
            axis: own === 'x' ? 'y' : 'x',
            from: info.world,
            route: pipe.route,
          }
          beginGesture()
          return 'drag'
        }
        return 'selected'
      }
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

      if (drag.kind === 'segment') {
        const step = current.settings.gridSize
        const raw = info.world[drag.axis] - drag.from[drag.axis]
        const delta = info.altKey ? Math.round(raw) : Math.round(raw / step) * step
        if (delta === 0) return true
        preview((s) =>
          editPipeRoute(s, drag.pipeId, () =>
            moveSegment(drag.route, drag.segment, drag.axis, delta),
          ),
        )
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

    /** Double click on a pipe segment adds a vertex there (switches the pipe to manual). */
    doubleClick(info: PointerInfo) {
      const { apply, hiddenSystems, select } = useEditorStore.getState()
      const hit = findPipeAt(scene, info.world, info.tolerance, hiddenSystems)
      if (!hit) return
      const a = hit.pipe.route[hit.segment]!
      const at = { x: info.world.x, y: info.world.y, z: a.z }
      const added = apply((s) =>
        editPipeRoute(s, hit.pipe.id, (route) => insertVertex(route, hit.segment, at)),
      )
      if (!added) return
      select({ kind: 'pipe', id: hit.pipe.id })
      const pipe = useEditorStore.getState().history.present.pipes.find((p) => p.id === hit.pipe.id)
      const vertex = pipe ? findVertexAt(pipe, info.world, info.tolerance * 2) : null
      useEditorStore.getState().setPipeEdit({ segment: null, vertex })
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
