import { selectScene, useEditorStore } from '../stores/editorStore'
import { EquipmentProperties } from './EquipmentProperties'
import { OpeningProperties } from './OpeningProperties'
import { SettingsProperties } from './SettingsProperties'
import { WallProperties } from './WallProperties'

/** Properties of the selected element, or project settings when nothing is selected. */
export function PropertiesPanel() {
  const scene = useEditorStore(selectScene)
  const selection = useEditorStore((s) => s.selection)

  const wall =
    selection?.kind === 'wall' ? scene.walls.find((w) => w.id === selection.id) : undefined
  const opening =
    selection?.kind === 'opening' ? scene.openings.find((o) => o.id === selection.id) : undefined

  const equipment =
    selection?.kind === 'equipment' ? scene.equipment.find((e) => e.id === selection.id) : undefined

  return (
    <div className="properties" aria-label="Lastnosti">
      {equipment ? (
        <EquipmentProperties equipment={equipment} systems={scene.settings.systems} />
      ) : wall ? (
        <WallProperties wall={wall} />
      ) : opening ? (
        <OpeningProperties opening={opening} />
      ) : (
        <SettingsProperties settings={scene.settings} />
      )}
    </div>
  )
}
