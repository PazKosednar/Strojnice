import { useState, type ReactNode } from 'react'
import { addObstacle } from '../core/obstacleOps'
import { planBoxFromCorners } from '../core/planBox'
import type { Point, ZoneKind } from '../core/scene'
import { snapToGrid } from '../core/snap'
import { addZone } from '../core/zoneOps'
import { newId } from '../editor/newId'
import { selectScene, useEditorStore } from '../stores/editorStore'
import type { PointerInfo } from './toolTypes'
import { worldToScreen, type View } from './viewport'

export const ZONE_NAMES: Record<ZoneKind, string> = {
  forbidden: 'Prepovedana cona',
  avoid: 'Cona izogibanja',
  preferred: 'Prednostna cona',
}

/**
 * Obstacle and zone tools: drag a rectangle in the plan (snapped to the grid, Alt = free).
 * The new element spans from the floor to the wall height of the project settings; heights
 * are then edited in the properties panel.
 */
export function useBoxTool(kind: 'obstacle' | 'zone' | null) {
  const scene = useEditorStore(selectScene)
  const [drag, setDrag] = useState<{ from: Point; to: Point } | null>(null)

  const [wasKind, setWasKind] = useState(kind)
  if (wasKind !== kind) {
    setWasKind(kind)
    setDrag(null)
  }

  const snap = (info: PointerInfo) =>
    info.altKey ? snapToGrid(info.world, 1) : snapToGrid(info.world, scene.settings.gridSize)

  return {
    hint:
      kind === 'obstacle'
        ? 'Povleci pravokotnik ovire (npr. el. omarica, kanal, steber). Višine vneseš v lastnostih. Alt izklopi snap.'
        : 'Povleci pravokotnik cone. Vrsto (prepovedana, izogibanja, prednostna) izbereš v orodni vrstici ali lastnostih.',
    /** Returns true when a drag started (the plan captures the pointer). */
    pointerDown(info: PointerInfo): boolean {
      if (!kind) return false
      const p = snap(info)
      setDrag({ from: p, to: p })
      return true
    },
    pointerMove(info: PointerInfo) {
      if (drag) setDrag({ ...drag, to: snap(info) })
    },
    pointerUp() {
      if (!kind || !drag) return
      setDrag(null)
      const { apply, select, setMessage, setTool, spaceDraft } = useEditorStore.getState()
      const box = planBoxFromCorners(drag.from, drag.to, 0, scene.settings.wallHeight)
      if (box.width === 0 || box.depth === 0) {
        setMessage('Povleci pravokotnik (klik ni dovolj).')
        return
      }
      const id = newId()
      const added =
        kind === 'obstacle'
          ? apply((s) =>
              addObstacle(s, { id, name: 'Ovira', category: spaceDraft.category, ...box }),
            )
          : apply((s) =>
              addZone(s, {
                id,
                name: ZONE_NAMES[spaceDraft.zoneKind],
                kind: spaceDraft.zoneKind,
                ...box,
              }),
            )
      if (!added) return
      setTool('select')
      select({ kind, id })
    },
    renderOverlay(view: View): ReactNode {
      if (!kind || !drag) return null
      const a = worldToScreen(view, drag.from)
      const b = worldToScreen(view, drag.to)
      return (
        <rect
          className="box-draft"
          x={Math.min(a.x, b.x)}
          y={Math.min(a.y, b.y)}
          width={Math.abs(b.x - a.x)}
          height={Math.abs(b.y - a.y)}
        />
      )
    },
  }
}
