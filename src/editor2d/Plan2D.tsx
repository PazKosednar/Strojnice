import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react'
import { findOpeningAt, findWallAt } from '../core/hitTest'
import { placeOpening, removeOpening } from '../core/openingOps'
import type { Point } from '../core/scene'
import { snapPoint, snapToGrid, type SnapResult } from '../core/snap'
import { addWall, moveWallEndpoint, removeWall } from '../core/wallOps'
import { newId } from '../editor/newId'
import { selectScene, useEditorStore } from '../stores/editorStore'
import { PlanDimensions } from './PlanDimensions'
import { PlanDraftPreview } from './PlanDraftPreview'
import { PlanGrid } from './PlanGrid'
import { PlanWalls } from './PlanWalls'
import { ScaleBar } from './ScaleBar'
import { sceneBounds } from './sceneBounds'
import { useElementSize } from './useElementSize'
import { draftTarget, editTypedLength, parseTypedLength } from './wallDrawing'
import { fitView, panBy, screenToWorld, worldToScreen, zoomAt, type View } from './viewport'

/** Pick tolerance around walls (screen px). */
const HIT_PX = 6
/** Snap distance to existing endpoints (screen px). */
const SNAP_PX = 12
const ANGLE_TOLERANCE = (5 * Math.PI) / 180

interface Draft {
  start: Point
  /** First point of the chain; clicking it again closes the chain. */
  origin: Point
  referenceAngle?: number
}

type Drag =
  | { kind: 'pan'; x: number; y: number }
  | { kind: 'endpoint'; wallId: string; which: 'start' | 'end' }

const samePoint = (a: Point, b: Point) => a.x === b.x && a.y === b.y

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')

const HINTS = {
  select:
    'Klikni steno ali odprtino za urejanje. Vleci krajišče izbrane stene. Vleci ozadje za pomik.',
  wallStart: 'Klikni začetno točko stene.',
  wallNext:
    'Klikni naslednjo točko ali vtipkaj dolžino v mm in pritisni Enter. Esc konča risanje. Alt izklopi snap.',
  door: 'Klikni na steno, kamor želiš postaviti vrata.',
  window: 'Klikni na steno, kamor želiš postaviti okno.',
  delete: 'Klikni steno ali odprtino, ki jo želiš izbrisati.',
} as const

/** 2D plan editor (SVG). Shows the scene from the editor store and edits it via scene operations. */
export function Plan2D() {
  const scene = useEditorStore(selectScene)
  const selection = useEditorStore((s) => s.selection)
  const tool = useEditorStore((s) => s.tool)
  const { apply, select, preview, beginGesture, endGesture, setMessage } = useEditorStore.getState()

  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const size = useElementSize(containerRef)

  // `view` stays null (auto-fit to the scene) until the user pans or zooms.
  const [view, setView] = useState<View | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [cursor, setCursor] = useState<SnapResult | null>(null)
  const [typed, setTyped] = useState('')
  const dragRef = useRef<Drag | null>(null)
  const spaceRef = useRef(false)

  // Reset transient drawing state when the tool changes; refit when the first walls appear.
  const [prevTool, setPrevTool] = useState(tool)
  if (prevTool !== tool) {
    setPrevTool(tool)
    setDraft(null)
    setTyped('')
    setCursor(null)
  }
  const hasWalls = scene.walls.length > 0
  const [prevHasWalls, setPrevHasWalls] = useState(hasWalls)
  if (prevHasWalls !== hasWalls) {
    setPrevHasWalls(hasWalls)
    if (hasWalls) setView(null)
  }

  const bounds = useMemo(() => sceneBounds(scene), [scene])
  const activeView: View | null = view ?? (size ? fitView(bounds, size.width, size.height) : null)

  const local = (e: { clientX: number; clientY: number }): Point => {
    const rect = svgRef.current!.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const snap = (world: Point, free: boolean, from?: Draft | null): SnapResult => {
    if (free) return { point: snapToGrid(world, 1), kind: 'grid' }
    return snapPoint(world, {
      walls: scene.walls,
      gridSize: scene.settings.gridSize,
      endpointTolerance: SNAP_PX / activeView!.scale,
      angleTolerance: ANGLE_TOLERANCE,
      from: from?.start,
      referenceAngle: from?.referenceAngle,
    })
  }

  const commitPoint = (target: Point) => {
    if (!draft) {
      setDraft({ start: target, origin: target })
      setTyped('')
      return
    }
    if (samePoint(target, draft.start)) return
    const ok = apply((s) => addWall(s, { start: draft.start, end: target }, newId()))
    if (!ok) return
    setTyped('')
    if (samePoint(target, draft.origin)) {
      setDraft(null)
      return
    }
    const angle = Math.atan2(target.y - draft.start.y, target.x - draft.start.x)
    setDraft({ start: target, origin: draft.origin, referenceAngle: angle })
  }

  const onPointerDown = (e: PointerEvent<SVGSVGElement>) => {
    if (!activeView) return
    const screen = local(e)
    const world = screenToWorld(activeView, screen)
    const startPan = () => {
      dragRef.current = { kind: 'pan', x: screen.x, y: screen.y }
      e.currentTarget.setPointerCapture(e.pointerId)
    }
    if (e.button === 1 || (e.button === 0 && spaceRef.current)) {
      e.preventDefault()
      return startPan()
    }
    if (e.button !== 0) return
    const tolerance = HIT_PX / activeView.scale

    if (tool === 'wall') {
      const snapped = snap(world, e.altKey, draft)
      commitPoint(draft ? draftTarget(draft.start, snapped.point, typed) : snapped.point)
      return
    }
    if (tool === 'door' || tool === 'window') {
      const hit = findWallAt(scene.walls, world, tolerance)
      if (!hit) return setMessage('Klikni na steno.')
      const id = newId()
      if (apply((s) => placeOpening(s, hit.wall.id, tool, hit.along, id))) {
        select({ kind: 'opening', id })
      }
      return
    }
    if (tool === 'delete') {
      const opening = findOpeningAt(scene, world, tolerance)
      if (opening) return void apply((s) => removeOpening(s, opening.id))
      const hit = findWallAt(scene.walls, world, tolerance)
      if (hit) apply((s) => removeWall(s, hit.wall.id))
      return
    }

    // Select tool.
    const handle = (e.target as Element).closest('[data-handle]')
    if (handle && selection?.kind === 'wall') {
      const which = handle.getAttribute('data-handle') === 'start' ? 'start' : 'end'
      dragRef.current = { kind: 'endpoint', wallId: selection.id, which }
      e.currentTarget.setPointerCapture(e.pointerId)
      beginGesture()
      return
    }
    const opening = findOpeningAt(scene, world, tolerance)
    if (opening) return select({ kind: 'opening', id: opening.id })
    const hit = findWallAt(scene.walls, world, tolerance)
    if (hit) return select({ kind: 'wall', id: hit.wall.id })
    select(null)
    startPan()
  }

  const onPointerMove = (e: PointerEvent<SVGSVGElement>) => {
    if (!activeView) return
    const screen = local(e)
    const drag = dragRef.current
    if (drag?.kind === 'pan') {
      setView(panBy(activeView, screen.x - drag.x, screen.y - drag.y))
      dragRef.current = { ...drag, x: screen.x, y: screen.y }
      return
    }
    const world = screenToWorld(activeView, screen)
    if (drag?.kind === 'endpoint') {
      const current = useEditorStore.getState().history.present
      const wall = current.walls.find((w) => w.id === drag.wallId)
      if (!wall) return
      const moving = wall[drag.which]
      const other = drag.which === 'start' ? wall.end : wall.start
      const snapped = e.altKey
        ? snapToGrid(world, 1)
        : snapPoint(world, {
            walls: current.walls.filter(
              (w) => !samePoint(w.start, moving) && !samePoint(w.end, moving),
            ),
            gridSize: current.settings.gridSize,
            endpointTolerance: SNAP_PX / activeView.scale,
            angleTolerance: ANGLE_TOLERANCE,
            from: other,
          }).point
      preview((s) => moveWallEndpoint(s, drag.wallId, drag.which, snapped))
      return
    }
    if (tool === 'wall') setCursor(snap(world, e.altKey, draft))
  }

  const onPointerUp = () => {
    if (dragRef.current?.kind === 'endpoint') endGesture()
    dragRef.current = null
  }

  // Wheel zoom (native listener: React's wheel handler is passive and cannot preventDefault).
  useEffect(() => {
    const svg = svgRef.current
    if (!svg || !activeView) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = svg.getBoundingClientRect()
      const anchor = { x: e.clientX - rect.left, y: e.clientY - rect.top }
      setView(zoomAt(activeView, Math.exp(-e.deltaY * 0.0015), anchor))
    }
    svg.addEventListener('wheel', onWheel, { passive: false })
    return () => svg.removeEventListener('wheel', onWheel)
  }, [activeView])

  // Keyboard: typed wall length, Enter, Esc while drawing; Space for panning.
  // Capture phase so it runs before the editor-wide shortcuts.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return
      if (e.key === ' ') spaceRef.current = true
      if (tool !== 'wall' || !draft || e.ctrlKey || e.metaKey || e.altKey) return
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
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ') spaceRef.current = false
    }
    window.addEventListener('keydown', onKeyDown, true)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown, true)
      window.removeEventListener('keyup', onKeyUp)
    }
  })

  const selectedWall =
    tool === 'select' && selection?.kind === 'wall'
      ? scene.walls.find((w) => w.id === selection.id)
      : undefined

  const hint = tool === 'wall' ? (draft ? HINTS.wallNext : HINTS.wallStart) : HINTS[tool]

  const draftTargetPoint =
    tool === 'wall' && cursor
      ? draft
        ? draftTarget(draft.start, cursor.point, typed)
        : cursor.point
      : null

  return (
    <div className="plan2d" ref={containerRef}>
      {activeView && size && (
        <svg
          ref={svgRef}
          width={size.width}
          height={size.height}
          className={`plan2d-svg tool-${tool}`}
          role="application"
          aria-label="2D tloris"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onContextMenu={(e) => e.preventDefault()}
        >
          <PlanGrid
            view={activeView}
            width={size.width}
            height={size.height}
            gridSize={scene.settings.gridSize}
          />
          <PlanWalls scene={scene} view={activeView} selection={selection} />
          <PlanDimensions walls={scene.walls} view={activeView} />
          {selectedWall &&
            (['start', 'end'] as const).map((which) => {
              const p = worldToScreen(activeView, selectedWall[which])
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
            })}
          {draftTargetPoint && cursor && (
            <PlanDraftPreview
              view={activeView}
              start={draft?.start ?? null}
              target={draftTargetPoint}
              snapKind={cursor.kind}
              typed={typed}
            />
          )}
          <ScaleBar view={activeView} height={size.height} />
        </svg>
      )}
      <button type="button" className="plan2d-fit" onClick={() => setView(null)}>
        Prilagodi pogled
      </button>
      <p className="plan2d-hint">{hint}</p>
    </div>
  )
}
