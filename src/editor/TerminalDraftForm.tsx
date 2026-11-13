import { selectScene, useEditorStore } from '../stores/editorStore'

const parseMm = (text: string) => (/^\d+$/.test(text.trim()) ? Number(text.trim()) : null)

/** Values for the next wall terminal; shown while the terminal tool is active. */
export function TerminalDraftForm() {
  const systems = useEditorStore((s) => selectScene(s).settings.systems)
  const draft = useEditorStore((s) => s.terminalDraft)
  const setDraft = useEditorStore((s) => s.setTerminalDraft)
  const systemId = systems.some((s) => s.id === draft.systemId)
    ? draft.systemId
    : (systems[0]?.id ?? '')

  return (
    <form className="rect-room-form" aria-label="Nov izhod" onSubmit={(e) => e.preventDefault()}>
      <label>
        Sistem
        <select value={systemId} onChange={(e) => setDraft({ systemId: e.target.value })}>
          {systems.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Višina (mm)
        <input
          inputMode="numeric"
          value={draft.height ?? ''}
          onChange={(e) => setDraft({ height: parseMm(e.target.value) })}
        />
      </label>
      <label>
        Zunanji premer (mm)
        <input
          inputMode="numeric"
          value={draft.outerDiameter ?? ''}
          onChange={(e) => setDraft({ outerDiameter: parseMm(e.target.value) })}
        />
      </label>
      <span className="unit">Nato klikni na steno.</span>
    </form>
  )
}
