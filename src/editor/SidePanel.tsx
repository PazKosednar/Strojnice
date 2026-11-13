import { useMemo, useState } from 'react'
import type { PanelTab } from '../stores/editorStore'
import { CatalogPanel } from '../catalog/CatalogPanel'
import { sceneWarnings } from '../core/sceneWarnings'
import { selectScene, useEditorStore } from '../stores/editorStore'
import { PropertiesPanel } from './PropertiesPanel'
import { RulesPanel } from './RulesPanel'
import { WarningsPanel } from './WarningsPanel'

type Tab = PanelTab

/** Side panel with tabs: properties of the selection, catalogue, project rules, warnings. */
export function SidePanel() {
  const scene = useEditorStore(selectScene)
  const selection = useEditorStore((s) => s.selection)
  const warnings = useMemo(() => sceneWarnings(scene), [scene])
  const tab = useEditorStore((s) => s.panelTab)
  const setTab = useEditorStore((s) => s.setPanelTab)

  // Selecting an element (in the plan or from a warning) shows its properties.
  const selectedId = selection?.id ?? null
  const [shownId, setShownId] = useState(selectedId)
  if (shownId !== selectedId) {
    setShownId(selectedId)
    if (selectedId) setTab('properties')
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'properties', label: 'Lastnosti' },
    { key: 'catalog', label: 'Katalog' },
    { key: 'rules', label: 'Pravila' },
    { key: 'warnings', label: `Opozorila (${warnings.length})` },
  ]

  return (
    <aside className="side-panel">
      <div className="tabs" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            className={t.key === 'warnings' && warnings.length > 0 ? 'has-warnings' : undefined}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="side-panel-body" role="tabpanel">
        {tab === 'properties' && <PropertiesPanel />}
        {tab === 'catalog' && <CatalogPanel />}
        {tab === 'rules' && <RulesPanel scene={scene} />}
        {tab === 'warnings' && <WarningsPanel scene={scene} warnings={warnings} />}
      </div>
    </aside>
  )
}
