import { useEffect, useState, type ReactNode } from 'react'
import type { Point } from '../core/scene'
import { snapPoint, snapToGrid, type SnapResult } from '../core/snap'
import { addWall } from '../core/wallOps'
import { newId } from '../editor/newId'
import { selectScene, useEditorStore } from '../stores/editorStore'
import { PlanDraftPreview } from './PlanDraftPreview'
import { isTyping, type PointerInfo } from './toolTypes'
import type { View } from './viewport'
import { draftTarget, editTypedLength, parseTypedLength } from './wallDrawing'

export const ANGLE_TOLERANCE = (5 * Math.PI) / 180

interface Draft {
  start: Point
  /** First point of the chain; clicking it again closes the chain. */
  origin: Point
  referenceAngle?: number
}

const samePoint = (a: Point, b: Point) => a.x === b.x && a.y === b.y

const HINT_START = 'Klikni začetno točko stene.'
const HINT_NEXT =
  'Klikni naslednjo točko ali vtipkaj dolžino v mm in pritisni Enter. Esc konča risanje. Alt izklopi snap.'

/** Wall tool: click–click chains, typed length + Enter, Esc ends the chain. */
export function useWallTool(active: boolean) {
  const scene = useEditorStore(selectScene)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [cursor, setCursor] = useState<SnapResult | null>(null)
  const [typed, setTyped] = useState('')

  // Drop the unfinished wall when another tool is chosen.
  const [wasActive, setWasActive] = useState(active)
  if (wasActive !== active) {
    setWasActive(active)
    setDraft(null)
    setTyped('')
    setCursor(null)
  }

  const snap = (info: PointerInfo): SnapResult => {
    if (info.altKey) return { point: snapToGrid(info.world, 1), kind: 'grid' }
    return snapPoint(info.world, {
      walls: scene.walls,
      gridSize: scene.settings.gridSize,
      endpointTolerance: info.snapDistance,
      angleTolerance: ANGLE_TOLERANCE,
      from: draft?.start,
      referenceAngle: draft?.referenceAngle,
    })
  }

  const commitPoint = (target: Point) => {
    if (!draft) {
      setDraft({ start: target, origin: target })
      setTyped('')
      return
    }
    if (samePoint(target, draft.start)) return
    const { apply } = useEditorStore.getState()
    if (!apply((s) => addWall(s, { start: draft.start, end: target }, newId()))) return
    setTyped('')
    if (samePoint(target, draft.origin)) {
      setDraft(null)
      return
    }
    const angle = Math.atan2(target.y - draft.start.y, target.x - draft.start.x)
    setDraft({ start: target, origin: draft.origin, referenceAngle: angle })
  }

  // Typed length, Enter and Esc while drawing. Capture phase, so it runs before the
  // editor-wide shortcuts.
  useEffect(() => {
    if (!active || !draft) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTyping(e.target) || e.ctrlKey || e.metaKey || e.altKey) return
      if (e.key === 'Escape') {
        e.preventDefault()
        setDraft(null)
        setTyped('')
        return
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        if (parseTypedLength(typed) === null) return
        const direction = cursor?.point ?? { x: draft.start.x + 1, y: draft.start.y }
        commitPoint(draftTarget(draft.start, direction, typed))
        return
      }
      const next = editTypedLength(typed, e.key)
      if (next !== null) {
        e.preventDefault()
        setTyped(next)
      }
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  })

  const target = cursor
    ? draft
      ? draftTarget(draft.start, cursor.point, typed)
      : cursor.point
    : null

  return {
    hint: draft ? HINT_NEXT : HINT_START,
    pointerDown(info: PointerInfo) {
      const snapped = snap(info)
      commitPoint(draft ? draftTarget(draft.start, snapped.point, typed) : snapped.point)
    },
    pointerMove(info: PointerInfo) {
      setCursor(snap(info))
    },
    renderOverlay(view: View): ReactNode {
      if (!active || !target || !cursor) return null
      return (
        <PlanDraftPreview
          view={view}
          start={draft?.start ?? null}
          target={target}
          snapKind={cursor.kind}
          typed={typed}
        />
      )
    },
  }
}
