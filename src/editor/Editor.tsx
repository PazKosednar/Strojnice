import { lazy, Suspense, useState } from 'react'
import { Plan2D } from '../editor2d/Plan2D'
import { useAutoRouting } from '../routing/useAutoRouting'
import { useEditorStore } from '../stores/editorStore'
import { AutoConnectPanel } from './AutoConnectPanel'
import { SidePanel } from './SidePanel'
import { Toolbar, type ViewMode } from './Toolbar'
import { useEditorShortcuts } from './useEditorShortcuts'
import { useSceneAutosave } from './useSceneAutosave'

// three.js is large; load the 3D view on demand.
const View3D = lazy(() => import('../view3d/View3D'))

interface Props {
  projectId: string
  projectName: string
}

/** Project editor: toolbar, 2D plan, 3D view and the side panel. */
export function Editor({ projectId, projectName }: Props) {
  const message = useEditorStore((s) => s.message)
  const setMessage = useEditorStore((s) => s.setMessage)
  const [viewMode, setViewMode] = useState<ViewMode>('both')
  useEditorShortcuts()
  useSceneAutosave(projectId)
  useAutoRouting()

  return (
    <div className="editor">
      <Toolbar projectName={projectName} viewMode={viewMode} onViewMode={setViewMode} />
      {message && (
        <div className="editor-message" role="alert">
          {message}
          <button type="button" aria-label="Zapri sporočilo" onClick={() => setMessage(null)}>
            ×
          </button>
        </div>
      )}
      <div className="editor-body">
        <div className={`editor-views views-${viewMode}`}>
          {viewMode !== '3d' && (
            <section className="editor-pane" aria-label="2D tloris">
              <Plan2D />
            </section>
          )}
          {viewMode !== '2d' && (
            <section className="editor-pane" aria-label="3D prikaz">
              <Suspense fallback={<p className="pane-loading">Nalaganje 3D pogleda …</p>}>
                <View3D />
              </Suspense>
            </section>
          )}
        </div>
        <AutoConnectPanel />
        <SidePanel />
      </div>
    </div>
  )
}
