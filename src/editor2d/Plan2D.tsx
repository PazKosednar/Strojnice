import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react'
import { removeEquipment } from '../core/equipmentOps'
import { findEquipmentAt, findOpeningAt, findWallAt } from '../core/hitTest'
import { placeOpening, removeOpening } from '../core/openingOps'
import type { Point } from '../core/scene'
import { equipmentWithConflicts, sceneWarnings } from '../core/sceneWarnings'
import { removeWall } from '../core/wallOps'
import { newId } from '../editor/newId'
import { selectScene, useEditorStore } from '../stores/editorStore'
import { PlanDimensions } from './PlanDimensions'
import { PlanEquipment } from './PlanEquipment'
import { PlanGrid } from './PlanGrid'
import { PlanWalls } from './PlanWalls'
import { ScaleBar } from './ScaleBar'
import { sceneBounds } from './sceneBounds'
import { isTyping, type PointerInfo } from './toolTypes'
import { useElementSize } from './useElementSize'
import { useEquipmentTool } from './useEquipmentTool'
import { SELECT_HINT, useSelectTool } from './useSelectTool'
import { useWallTool } from './useWallTool'
import { fitView, panBy, screenToWorld, zoomAt, type View } from './viewport'

/** Pick tolerance around walls (screen px). */
const HIT_PX = 6
/** Snap distance to existing endpoints and walls (screen px). */
const SNAP_PX = 12

const HINTS = {
  door: 'Klikni na steno, kamor želiš postaviti vrata.',
  window: 'Klikni na steno, kamor želiš postaviti okno.',
  delete: 'Klikni napravo, steno ali odprtino, ki jo želiš izbrisati.',
} as const

/**
 * 2D plan (SVG). Owns pan/zoom and hands pointer events to the active tool; the scene
 * itself comes from the editor store and is changed only through scene operations.
 */
export function Plan2D() {
  const scene = useEditorStore(selectScene)
  const selection = useEditorStore((s) => s.selection)
  const tool = useEditorStore((s) => s.tool)
  const showClearances = useEditorStore((s) => s.showClearances)

  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const size = useElementSize(containerRef)

  // Current pan/zoom (UI state only, not geometry).
  const [view, setView] = useState<View | null>(null)
  const panRef = useRef<Point | null>(null)
  const spaceRef = useRef(false)

  const wallTool = useWallTool(tool === 'wall')
  const selectTool = useSelectTool(tool === 'select')
  const equipmentTool = useEquipmentTool(tool === 'equipment')

  const hasWalls = scene.walls.length > 0
  const [prevHasWalls, setPrevHasWalls] = useState(hasWalls)
  // The view is fitted once (on open, when the first walls appear, or on request) and then
  // stays fixed, so the plan never moves under the cursor while the user edits.
  const [fitPending, setFitPending] = useState(true)
  if (prevHasWalls !== hasWalls) {
    setPrevHasWalls(hasWalls)
    if (hasWalls) setFitPending(true)
  }

  const bounds = useMemo(() => sceneBounds(scene), [scene])
  let activeView: View | null = view
  if (size && (fitPending || !view)) {
    activeView = fitView(bounds, size.width, size.height)
    setView(activeView)
    setFitPending(false)
  }

  const conflicts = useMemo(() => equipmentWithConflicts(sceneWarnings(scene)), [scene])

  const local = (e: { clientX: number; clientY: number }): Point => {
    const rect = svgRef.current!.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const pointerInfo = (e: PointerEvent<SVGSVGElement>, v: View): PointerInfo => ({
    world: screenToWorld(v, local(e)),
    altKey: e.altKey,
    tolerance: HIT_PX / v.scale,
    snapDistance: SNAP_PX / v.scale,
    target: e.target as Element,
  })

  const onPointerDown = (e: PointerEvent<SVGSVGElement>) => {
    if (!activeView) return
    const startPan = () => {
      panRef.current = local(e)
      e.currentTarget.setPointerCapture(e.pointerId)
    }
    if (e.button === 1 || (e.button === 0 && spaceRef.current)) {
      e.preventDefault()
      return startPan()
    }
    if (e.button !== 0) return
    const info = pointerInfo(e, activeView)
    const { apply, select, setMessage } = useEditorStore.getState()

    if (tool === 'wall') return wallTool.pointerDown(info)
    if (tool === 'equipment') return equipmentTool.pointerDown(info)
    if (tool === 'door' || tool === 'window') {
      const hit = findWallAt(scene.walls, info.world, info.tolerance)
      if (!hit) return setMessage('Klikni na steno.')
      const id = newId()
      if (apply((s) => placeOpening(s, hit.wall.id, tool, hit.along, id))) {
        select({ kind: 'opening', id })
      }
      return
    }
    if (tool === 'delete') {
      const item = findEquipmentAt(scene.equipment, info.world)
      if (item) return void apply((s) => removeEquipment(s, item.id))
      const opening = findOpeningAt(scene, info.world, info.tolerance)
      if (opening) return void apply((s) => removeOpening(s, opening.id))
      const hit = findWallAt(scene.walls, info.world, info.tolerance)
      if (hit) apply((s) => removeWall(s, hit.wall.id))
      return
    }

    const result = selectTool.pointerDown(info)
    if (result === 'drag') e.currentTarget.setPointerCapture(e.pointerId)
    if (result === 'none') {
      select(null)
      startPan()
    }
  }

  const onPointerMove = (e: PointerEvent<SVGSVGElement>) => {
    if (!activeView) return
    if (panRef.current) {
      const screen = local(e)
      setView(panBy(activeView, screen.x - panRef.current.x, screen.y - panRef.current.y))
      panRef.current = screen
      return
    }
    const info = pointerInfo(e, activeView)
    if (selectTool.pointerMove(info)) return
    if (tool === 'wall') wallTool.pointerMove(info)
    if (tool === 'equipment') equipmentTool.pointerMove(info)
  }

  const onPointerUp = () => {
    selectTool.pointerUp()
    panRef.current = null
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

  // Space + drag pans.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ' && !isTyping(e.target)) spaceRef.current = e.type === 'keydown'
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('keyup', onKey)
    }
  }, [])

  const hint =
    tool === 'wall'
      ? wallTool.hint
      : tool === 'equipment'
        ? equipmentTool.hint
        : tool === 'select'
          ? SELECT_HINT
          : HINTS[tool]

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
          <PlanEquipment
            scene={scene}
            view={activeView}
            selection={selection}
            conflicts={conflicts}
            showClearances={showClearances}
          />
          {selectTool.renderOverlay(activeView)}
          {wallTool.renderOverlay(activeView)}
          {equipmentTool.renderOverlay(activeView)}
          <ScaleBar view={activeView} height={size.height} />
        </svg>
      )}
      <button type="button" className="plan2d-fit" onClick={() => setFitPending(true)}>
        Prilagodi pogled
      </button>
      <p className="plan2d-hint">{hint}</p>
    </div>
  )
}
