import { selectScene, useEditorStore } from '../stores/editorStore'
import { EquipmentProperties } from './EquipmentProperties'
import { OpeningProperties } from './OpeningProperties'
import { PipeProperties } from './PipeProperties'
import { SettingsProperties } from './SettingsProperties'
import { TerminalProperties } from './TerminalProperties'
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

  const pipe =
    selection?.kind === 'pipe' ? scene.pipes.find((p) => p.id === selection.id) : undefined
  const terminal =
    selection?.kind === 'terminal' ? scene.terminals.find((t) => t.id === selection.id) : undefined

  return (
    <div className="properties" aria-label="Lastnosti">
      {pipe ? (
        <PipeProperties pipe={pipe} scene={scene} />
      ) : terminal ? (
        <TerminalProperties terminal={terminal} systems={scene.settings.systems} />
      ) : equipment ? (
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
