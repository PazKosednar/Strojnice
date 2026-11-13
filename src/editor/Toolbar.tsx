import { useState } from 'react'
import { Link } from 'react-router'
import { useAutoConnectStore } from '../stores/autoConnectStore'
import { selectScene, useEditorStore, type Tool, type WallViewMode } from '../stores/editorStore'
import { RectRoomForm } from './RectRoomForm'
import { TerminalDraftForm } from './TerminalDraftForm'
import { SaveStatusIndicator } from './SaveStatusIndicator'
import { SpaceDraftForm } from './SpaceDraftForm'
import { SystemLegend } from './SystemLegend'

export type ViewMode = '2d' | 'both' | '3d'

const TOOLS: { tool: Tool; label: string }[] = [
  { tool: 'select', label: 'Izberi' },
  { tool: 'wall', label: 'Stena' },
  { tool: 'door', label: 'Vrata' },
  { tool: 'window', label: 'Okno' },
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

export function Toolbar({ projectName, viewMode, onViewMode }: Props) {
  const tool = useEditorStore((s) => s.tool)
  const setTool = useEditorStore((s) => s.setTool)
  const canUndo = useEditorStore((s) => s.history.past.length > 0)
  const canRedo = useEditorStore((s) => s.history.future.length > 0)
  const undo = useEditorStore((s) => s.undo)
  const redo = useEditorStore((s) => s.redo)
  const placingType = useEditorStore((s) => s.placingType)
  const showClearances = useEditorStore((s) => s.showClearances)
  const setShowClearances = useEditorStore((s) => s.setShowClearances)
  const routing = useEditorStore((s) => s.routing)
  const rerouteAll = useEditorStore((s) => s.rerouteAll)
  const wallViewMode = useEditorStore((s) => s.wallViewMode)
  const setWallViewMode = useEditorStore((s) => s.setWallViewMode)
  const [roomFormOpen, setRoomFormOpen] = useState(false)

  return (
    <div className="toolbar-wrap">
      <div className="toolbar" role="toolbar" aria-label="Orodja">
        <Link to="/projekti" className="back-link">
          ← Projekti
        </Link>
        <strong className="project-title">{projectName}</strong>
        <span className="toolbar-sep" />
        {TOOLS.map((t) => (
          <button
            key={t.tool}
            type="button"
            aria-pressed={tool === t.tool}
            onClick={() => setTool(t.tool)}
          >
            {t.label}
          </button>
        ))}
        <button
          type="button"
          aria-pressed={tool === 'equipment'}
          disabled={!placingType}
          title={
            placingType
              ? `Postavi: ${placingType.name}`
              : 'Najprej v katalogu izberi tip (gumb »Postavi«)'
          }
          onClick={() => setTool('equipment')}
        >
          Naprava
        </button>
        <button type="button" aria-pressed={tool === 'pipe'} onClick={() => setTool('pipe')}>
          Cev
        </button>
        <button
          type="button"
          aria-pressed={tool === 'terminal'}
          onClick={() => setTool('terminal')}
        >
          Izhod
        </button>
        <button
          type="button"
          aria-pressed={tool === 'obstacle'}
          onClick={() => setTool('obstacle')}
        >
          Ovira
        </button>
        <button type="button" aria-pressed={tool === 'zone'} onClick={() => setTool('zone')}>
          Cona
        </button>
        <button type="button" aria-pressed={tool === 'delete'} onClick={() => setTool('delete')}>
          Briši
        </button>
        <button
          type="button"
          aria-expanded={roomFormOpen}
          onClick={() => setRoomFormOpen((open) => !open)}
        >
          Pravokoten prostor
        </button>
        <span className="toolbar-sep" />
        <button type="button" onClick={undo} disabled={!canUndo} title="Ctrl+Z">
          Razveljavi
        </button>
        <button type="button" onClick={redo} disabled={!canRedo} title="Ctrl+Y">
          Uveljavi
        </button>
        <label className="toggle">
          <input
            type="checkbox"
            checked={showClearances}
            onChange={(e) => setShowClearances(e.target.checked)}
          />
          Odmiki
        </label>
        <button
          type="button"
          onClick={() =>
            useAutoConnectStore.getState().open(selectScene(useEditorStore.getState()))
          }
          title="Predlaga, kateri prosti priključki se povežejo, in vse cevi spelje skupaj"
        >
          Samodejno poveži in spelji
        </button>
        <button
          type="button"
          onClick={rerouteAll}
          disabled={routing.total > 0}
          title="Ročnih cevi ne spremeni"
        >
          Ponovno speljaj vse samodejne
        </button>
        {routing.total > 0 && (
          <span className="routing-status" role="status">
            Speljujem cevi {routing.done}/{routing.total} …
          </span>
        )}
        <span className="spacer" />
        {viewMode !== '2d' && (
          <select
            aria-label="Stene v 3D"
            value={wallViewMode}
            onChange={(e) => setWallViewMode(e.target.value as WallViewMode)}
          >
            <option value="hide">Skrij sprednje stene</option>
            <option value="transparent">Prosojne sprednje stene</option>
            <option value="all">Pokaži vse</option>
          </select>
        )}
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
