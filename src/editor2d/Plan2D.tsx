import { useEffect, useMemo, useRef, useState, type MouseEvent, type PointerEvent } from 'react'
import { removeEquipment } from '../core/equipmentOps'
import { findBoxAt, findEquipmentAt, findOpeningAt, findWallAt } from '../core/hitTest'
import { removeObstacle } from '../core/obstacleOps'
import { placeOpening, removeOpening } from '../core/openingOps'
import { findEndAt, findPipeAt } from '../core/pipeHitTest'
import { removePipe } from '../core/pipeOps'
import { removeTerminal } from '../core/terminalOps'
import type { Point } from '../core/scene'
import { equipmentWithConflicts, sceneWarnings } from '../core/sceneWarnings'
import { removeWall } from '../core/wallOps'
import { removeZone } from '../core/zoneOps'
import { newId } from '../editor/newId'
import { useAutoConnectStore } from '../stores/autoConnectStore'
import { selectScene, useEditorStore } from '../stores/editorStore'
import { endStates } from './endStates'
import { PlanDimensions } from './PlanDimensions'
import { PlanEquipment } from './PlanEquipment'
import { PlanGrid } from './PlanGrid'
import { PlanPipes } from './PlanPipes'
import { PlanHighlight, PlanObstacles, PlanZones } from './PlanSpace'
import { PlanTerminals } from './PlanTerminals'
import { PlanWalls } from './PlanWalls'
import { ScaleBar } from './ScaleBar'
import { sceneBounds } from './sceneBounds'
import { isTyping, type PointerInfo } from './toolTypes'
import { useElementSize } from './useElementSize'
import { useBoxTool } from './useBoxTool'
import { useEquipmentTool } from './useEquipmentTool'
import { usePipeTool } from './usePipeTool'
import { SELECT_HINT, useSelectTool } from './useSelectTool'
import { useTerminalTool } from './useTerminalTool'
import { useWallTool } from './useWallTool'
import { fitView, panBy, screenToWorld, zoomAt, type View } from './viewport'

/** Pick tolerance around walls (screen px). */
const HIT_PX = 6
/** Snap distance to existing endpoints and walls (screen px). */
const SNAP_PX = 12

const HINTS = {
  door: 'Klikni na steno, kamor želiš postaviti vrata.',
  window: 'Klikni na steno, kamor želiš postaviti okno.',
  delete: 'Klikni cev, izhod, napravo, oviro, cono, steno ali odprtino, ki jo želiš izbrisati.',
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
  const hiddenSystems = useEditorStore((s) => s.hiddenSystems)
  const pipeEdit = useEditorStore((s) => s.pipeEdit)
  const highlight = useEditorStore((s) => s.highlight)
  const preview = useAutoConnectStore((s) => (s.stage === 'preview' ? s.preview : null))
  const previewIds = useAutoConnectStore((s) => s.previewIds)
  const proposed = useMemo(
    () =>
      preview
        ? { ...preview, pipes: preview.pipes.filter((p) => previewIds.includes(p.id)) }
        : null,
    [preview, previewIds],
  )

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
  const pipeTool = usePipeTool(tool === 'pipe')
  const terminalTool = useTerminalTool()
  const boxTool = useBoxTool(tool === 'obstacle' || tool === 'zone' ? tool : null)

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
  const states = useMemo(
    () => endStates(scene, tool === 'pipe' ? pipeTool.source : null),
    [scene, tool, pipeTool.source],
  )

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
    if (tool === 'pipe') return pipeTool.pointerDown(info, activeView.scale)
    if (tool === 'terminal') return terminalTool.pointerDown(info)
    if (tool === 'obstacle' || tool === 'zone') {
      if (boxTool.pointerDown(info)) e.currentTarget.setPointerCapture(e.pointerId)
      return
    }
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
      const end = findEndAt(scene, info.world, info.tolerance * 1.5)
      if (end?.kind === 'terminal') return void apply((s) => removeTerminal(s, end.terminalId))
      const pipeHit = findPipeAt(scene, info.world, info.tolerance, hiddenSystems)
      if (pipeHit) return void apply((s) => removePipe(s, pipeHit.pipe.id))
      const item = findEquipmentAt(scene.equipment, info.world)
      if (item) return void apply((s) => removeEquipment(s, item.id))
      const obstacle = findBoxAt(scene.obstacles, info.world)
      if (obstacle) return void apply((s) => removeObstacle(s, obstacle.id))
      const opening = findOpeningAt(scene, info.world, info.tolerance)
      if (opening) return void apply((s) => removeOpening(s, opening.id))
      const hit = findWallAt(scene.walls, info.world, info.tolerance)
      if (hit) return void apply((s) => removeWall(s, hit.wall.id))
      const zone = findBoxAt(scene.zones, info.world)
      if (zone) apply((s) => removeZone(s, zone.id))
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
    if (tool === 'obstacle' || tool === 'zone') boxTool.pointerMove(info)
  }

  const onDoubleClick = (e: MouseEvent<SVGSVGElement>) => {
    if (!activeView || tool !== 'select') return
    selectTool.doubleClick({
      world: screenToWorld(activeView, local(e)),
      altKey: e.altKey,
      tolerance: HIT_PX / activeView.scale,
      snapDistance: SNAP_PX / activeView.scale,
      target: e.target as Element,
    })
  }

  const onPointerUp = () => {
    selectTool.pointerUp()
    boxTool.pointerUp()
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
          : tool === 'pipe'
            ? pipeTool.hint
            : tool === 'terminal'
              ? terminalTool.hint
              : tool === 'obstacle' || tool === 'zone'
                ? boxTool.hint
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
          onDoubleClick={onDoubleClick}
          onContextMenu={(e) => e.preventDefault()}
        >
          <PlanGrid
            view={activeView}
            width={size.width}
            height={size.height}
            gridSize={scene.settings.gridSize}
          />
          <PlanZones scene={scene} view={activeView} selection={selection} />
          <PlanWalls scene={scene} view={activeView} selection={selection} />
          <PlanDimensions walls={scene.walls} view={activeView} />
          <PlanEquipment
            scene={scene}
            view={activeView}
            selection={selection}
            conflicts={conflicts}
            showClearances={showClearances}
            endStates={states}
            hiddenSystems={hiddenSystems}
          />
          <PlanObstacles scene={scene} view={activeView} selection={selection} />
          <PlanPipes
            scene={scene}
            view={activeView}
            hiddenSystems={hiddenSystems}
            selectedPipeId={selection?.kind === 'pipe' ? selection.id : null}
            selectedVertex={pipeEdit.vertex}
          />
          {proposed && (
            <g className="proposed-pipes" data-testid="proposed-pipes">
              <PlanPipes
                scene={proposed}
                view={activeView}
                hiddenSystems={hiddenSystems}
                selectedPipeId={null}
                selectedVertex={null}
              />
            </g>
          )}
          <PlanTerminals
            scene={scene}
            view={activeView}
            states={states}
            selectedId={selection?.kind === 'terminal' ? selection.id : null}
            hiddenSystems={hiddenSystems}
          />
          {selectTool.renderOverlay(activeView)}
          {wallTool.renderOverlay(activeView)}
          {equipmentTool.renderOverlay(activeView)}
          {boxTool.renderOverlay(activeView)}
          <PlanHighlight view={activeView} point={highlight} />
          <ScaleBar view={activeView} height={size.height} />
        </svg>
      )}
      <button type="button" className="plan2d-fit" onClick={() => setFitPending(true)}>
        Prilagodi pogled
      </button>
      {!hasWalls && (
        <div className="plan-guide" role="note">
          <strong>Kako začeti</strong>
          <ol>
            <li>
              <b>Pravokoten prostor</b>: vpiši mere prostora.
            </li>
            <li>
              <b>Dodaj napravo</b>: v katalogu pri napravi klikni »Postavi« in klikni v tloris.
              Stenski napravi vpiši višino od tal.
            </li>
            <li>
              <b>Samodejno poveži in spelji</b>: cevi se povežejo in speljejo same.
            </li>
          </ol>
        </div>
      )}
      <p className="plan2d-hint">{hint}</p>
    </div>
  )
}
