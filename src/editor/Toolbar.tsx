import { useState } from 'react'
import { Link } from 'react-router'
import { useAutoConnectStore } from '../stores/autoConnectStore'
import {
  selectScene,
  useEditorStore,
  type PipeLook,
  type Tool,
  type WallViewMode,
} from '../stores/editorStore'
import { RectRoomForm } from './RectRoomForm'
import { SaveStatusIndicator } from './SaveStatusIndicator'
import { SpaceDraftForm } from './SpaceDraftForm'
import { SystemLegend } from './SystemLegend'
import { TerminalDraftForm } from './TerminalDraftForm'

export type ViewMode = '2d' | 'both' | '3d'

/** Rarely used tools, in the "Več" menu. */
const MORE_TOOLS: { tool: Tool; label: string }[] = [
  { tool: 'door', label: 'Vrata' },
  { tool: 'window', label: 'Okno' },
  { tool: 'terminal', label: 'Izhod v steni' },
  { tool: 'obstacle', label: 'Ovira' },
  { tool: 'zone', label: 'Cona' },
]

const VIEWS: { mode: ViewMode; label: string }[] = [
  { mode: '2d', label: '2D' },
  { mode: 'both', label: '2D + 3D' },
  { mode: '3d', label: '3D' },
]

interface Props {
  projectName: string
  viewMode: ViewMode
  onViewMode: (mode: ViewMode) => void
}

/**
 * The main steps in one row, in the order of the work (room, equipment, pipes); everything
 * else in "Več".
 */
export function Toolbar({ projectName, viewMode, onViewMode }: Props) {
  const tool = useEditorStore((s) => s.tool)
  const setTool = useEditorStore((s) => s.setTool)
  const canUndo = useEditorStore((s) => s.history.past.length > 0)
  const canRedo = useEditorStore((s) => s.history.future.length > 0)
  const undo = useEditorStore((s) => s.undo)
  const redo = useEditorStore((s) => s.redo)
  const showClearances = useEditorStore((s) => s.showClearances)
  const setShowClearances = useEditorStore((s) => s.setShowClearances)
  const routing = useEditorStore((s) => s.routing)
  const rerouteAll = useEditorStore((s) => s.rerouteAll)
  const wallViewMode = useEditorStore((s) => s.wallViewMode)
  const setWallViewMode = useEditorStore((s) => s.setWallViewMode)
  const pipeLook = useEditorStore((s) => s.pipeLook)
  const setPipeLook = useEditorStore((s) => s.setPipeLook)
  const setPanelTab = useEditorStore((s) => s.setPanelTab)
  const [roomFormOpen, setRoomFormOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)

  const toolButton = (t: Tool, label: string) => (
    <button key={t} type="button" aria-pressed={tool === t} onClick={() => setTool(t)}>
      {label}
    </button>
  )

  return (
    <div className="toolbar-wrap">
      <div className="toolbar" role="toolbar" aria-label="Orodja">
        <Link to="/projekti" className="back-link">
          ← Projekti
        </Link>
        <strong className="project-title">{projectName}</strong>
        <span className="toolbar-sep" />
        {toolButton('select', 'Izberi')}
        <button
          type="button"
          aria-expanded={roomFormOpen}
          onClick={() => setRoomFormOpen((open) => !open)}
        >
          Pravokoten prostor
        </button>
        {toolButton('wall', 'Stena')}
        <button
          type="button"
          aria-pressed={tool === 'equipment'}
          onClick={() => setPanelTab('catalog')}
          title="Odpre katalog; tam pri napravi klikni »Postavi«"
        >
          Dodaj napravo
        </button>
        {toolButton('pipe', 'Cev')}
        <button
          type="button"
          className="primary"
          onClick={() =>
            useAutoConnectStore.getState().open(selectScene(useEditorStore.getState()))
          }
          title="Predlaga, kateri prosti priključki se povežejo, in vse cevi spelje skupaj"
        >
          Samodejno poveži in spelji
        </button>
        {toolButton('delete', 'Briši')}
        <span className="toolbar-sep" />
        <button
          type="button"
          onClick={undo}
          disabled={!canUndo}
          title="Razveljavi (Ctrl+Z)"
          aria-label="Razveljavi"
        >
          ↶
        </button>
        <button
          type="button"
          onClick={redo}
          disabled={!canRedo}
          title="Uveljavi (Ctrl+Y)"
          aria-label="Uveljavi"
        >
          ↷
        </button>
        <span className="more">
          <button
            type="button"
            aria-expanded={moreOpen}
            aria-pressed={MORE_TOOLS.some((t) => t.tool === tool)}
            onClick={() => setMoreOpen((open) => !open)}
          >
            Več ▾
          </button>
          {moreOpen && (
            <div className="more-menu" role="menu" aria-label="Več">
              {MORE_TOOLS.map((t) => (
                <button
                  key={t.tool}
                  type="button"
                  role="menuitemradio"
                  aria-checked={tool === t.tool}
                  onClick={() => {
                    setTool(t.tool)
                    setMoreOpen(false)
                  }}
                >
                  {t.label}
                </button>
              ))}
              <hr />
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={showClearances}
                  onChange={(e) => setShowClearances(e.target.checked)}
                />
                Odmiki v tlorisu
              </label>
              <button
                type="button"
                onClick={() => {
                  rerouteAll()
                  setMoreOpen(false)
                }}
                disabled={routing.total > 0}
                title="Ročnih cevi ne spremeni"
              >
                Ponovno speljaj vse samodejne
              </button>
              <hr />
              <label>
                Stene v 3D{' '}
                <select
                  value={wallViewMode}
                  onChange={(e) => setWallViewMode(e.target.value as WallViewMode)}
                >
                  <option value="hide">Skrij sprednje stene</option>
                  <option value="transparent">Prosojne sprednje stene</option>
                  <option value="all">Pokaži vse</option>
                </select>
              </label>
              <label>
                Cevi v 3D{' '}
                <select value={pipeLook} onChange={(e) => setPipeLook(e.target.value as PipeLook)}>
                  <option value="copper">baker</option>
                  <option value="system">barve sistemov</option>
                </select>
              </label>
            </div>
          )}
        </span>
        {routing.total > 0 && (
          <span className="routing-status" role="status">
            Speljujem cevi {routing.done}/{routing.total} …
          </span>
        )}
        <span className="spacer" />
        <span className="segmented" role="group" aria-label="Pogled">
          {VIEWS.map((v) => (
            <button
              key={v.mode}
              type="button"
              aria-pressed={viewMode === v.mode}
              onClick={() => onViewMode(v.mode)}
            >
              {v.label}
            </button>
          ))}
        </span>
        <SaveStatusIndicator />
      </div>
      <div className="toolbar toolbar-secondary">
        <SystemLegend />
      </div>
      {roomFormOpen && <RectRoomForm onDone={() => setRoomFormOpen(false)} />}
      {tool === 'terminal' && <TerminalDraftForm />}
      {(tool === 'obstacle' || tool === 'zone') && <SpaceDraftForm kind={tool} />}
    </div>
  )
}
