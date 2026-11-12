import { selectScene, useEditorStore } from '../stores/editorStore'
import { OpeningProperties } from './OpeningProperties'
import { SettingsProperties } from './SettingsProperties'
import { WallProperties } from './WallProperties'

/** Side panel: properties of the selected element, or project settings when nothing is selected. */
export function PropertiesPanel() {
  const scene = useEditorStore(selectScene)
  const selection = useEditorStore((s) => s.selection)

  const wall =
    selection?.kind === 'wall' ? scene.walls.find((w) => w.id === selection.id) : undefined
  const opening =
    selection?.kind === 'opening' ? scene.openings.find((o) => o.id === selection.id) : undefined

  return (
    <aside className="properties" aria-label="Lastnosti">
      {wall ? (
        <WallProperties wall={wall} />
      ) : opening ? (
        <OpeningProperties opening={opening} />
      ) : (
        <SettingsProperties settings={scene.settings} />
      )}
    </aside>
  )
}
