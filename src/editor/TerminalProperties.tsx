import type { SystemDef, WallTerminal } from '../core/scene'
import { removeTerminal, updateTerminal, type TerminalPatch } from '../core/terminalOps'
import { useEditorStore } from '../stores/editorStore'
import { NumberField } from './NumberField'
import { TextField } from './TextField'

interface Props {
  terminal: WallTerminal
  systems: readonly SystemDef[]
}

/** Properties of a wall terminal (connection through the wall to an undrawn network). */
export function TerminalProperties({ terminal, systems }: Props) {
  const apply = useEditorStore((s) => s.apply)
  const update = (patch: TerminalPatch) => apply((s) => updateTerminal(s, terminal.id, patch))
  return (
    <>
      <h2>Izhod v steni</h2>
      <TextField label="Oznaka" value={terminal.tag} onCommit={(tag) => update({ tag })} />
      <div className="field">
        <label htmlFor="terminal-system">Sistem</label>
        <select
          id="terminal-system"
          value={terminal.systemId}
          onChange={(e) => update({ systemId: e.target.value })}
        >
          {systems.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      <NumberField
        label="Višina"
        value={terminal.height}
        onCommit={(height) => update({ height })}
      />
      <NumberField
        label="Zunanji premer"
        value={terminal.outerDiameter}
        onCommit={(outerDiameter) => update({ outerDiameter })}
      />
      <NumberField
        label="Odmik od začetka stene"
        value={terminal.offset}
        onCommit={(offset) => update({ offset })}
      />
      <p className="muted small">
        Izhod je priključek na razvod, ki ga ne rišemo (npr. vodovodni priključek). Leži na osi
        stene; cev skozi steno se šteje kot preboj.
      </p>
      <button type="button" onClick={() => apply((s) => removeTerminal(s, terminal.id))}>
        Izbriši izhod
      </button>
    </>
  )
}
