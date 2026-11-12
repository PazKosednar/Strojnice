import type { OpeningPreset, SceneSettings } from '../core/scene'
import { updateSettings } from '../core/settingsOps'
import { useEditorStore } from '../stores/editorStore'
import { NumberField } from './NumberField'
import { SystemsSettings } from './SystemsSettings'

/** Project settings: values used for newly created walls and openings. */
export function SettingsProperties({ settings }: { settings: SceneSettings }) {
  const apply = useEditorStore((s) => s.apply)
  const set = (patch: Partial<SceneSettings>) => apply((s) => updateSettings(s, patch))
  const setPreset = (type: 'door' | 'window', patch: Partial<OpeningPreset>) =>
    set({ [type]: { ...settings[type], ...patch } })

  return (
    <>
      <h2>Nastavitve projekta</h2>
      <p className="muted small">
        Vrednosti za nove stene in odprtine. Obstoječih elementov ne spremenijo.
      </p>
      <h3>Stena</h3>
      <NumberField
        label="Debelina"
        value={settings.wallThickness}
        onCommit={(v) => set({ wallThickness: v })}
      />
      <NumberField
        label="Višina"
        value={settings.wallHeight}
        onCommit={(v) => set({ wallHeight: v })}
      />
      <h3>Vrata</h3>
      <NumberField
        label="Širina"
        value={settings.door.width}
        onCommit={(v) => setPreset('door', { width: v })}
      />
      <NumberField
        label="Višina"
        value={settings.door.height}
        onCommit={(v) => setPreset('door', { height: v })}
      />
      <h3>Okno</h3>
      <NumberField
        label="Širina"
        value={settings.window.width}
        onCommit={(v) => setPreset('window', { width: v })}
      />
      <NumberField
        label="Višina"
        value={settings.window.height}
        onCommit={(v) => setPreset('window', { height: v })}
      />
      <NumberField
        label="Parapet"
        value={settings.window.sillHeight}
        onCommit={(v) => setPreset('window', { sillHeight: v })}
      />
      <h3>Risanje</h3>
      <NumberField
        label="Korak mreže"
        value={settings.gridSize}
        onCommit={(v) => set({ gridSize: v })}
      />
      <SystemsSettings systems={settings.systems} />
    </>
  )
}
