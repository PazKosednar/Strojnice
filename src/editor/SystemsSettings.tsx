import type { SystemDef } from '../core/scene'
import { addSystem, removeSystem, updateSystem } from '../core/systemOps'
import { useEditorStore } from '../stores/editorStore'
import { newId } from './newId'
import { TextField } from './TextField'

/** Editable list of the project's systems (media): colour and name. */
export function SystemsSettings({ systems }: { systems: readonly SystemDef[] }) {
  const apply = useEditorStore((s) => s.apply)
  return (
    <>
      <h3>Sistemi</h3>
      <ul className="system-list">
        {systems.map((system) => (
          <li key={system.id}>
            <input
              type="color"
              aria-label={`Barva sistema ${system.name}`}
              value={system.color}
              onChange={(e) => apply((s) => updateSystem(s, system.id, { color: e.target.value }))}
            />
            <TextField
              label={`Ime sistema ${system.name}`}
              value={system.name}
              onCommit={(name) => apply((s) => updateSystem(s, system.id, { name }))}
            />
            <button
              type="button"
              aria-label={`Izbriši sistem ${system.name}`}
              onClick={() => apply((s) => removeSystem(s, system.id))}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() =>
          apply((s) =>
            addSystem(s, { id: newId(), name: 'Nov sistem', color: '#7f7f7f', lineStyle: 'solid' }),
          )
        }
      >
        Dodaj sistem
      </button>
    </>
  )
}
