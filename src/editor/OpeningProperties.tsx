import { removeOpening, updateOpening, type OpeningPatch } from '../core/openingOps'
import type { Opening } from '../core/scene'
import { useEditorStore } from '../stores/editorStore'
import { NumberField } from './NumberField'

export function OpeningProperties({ opening }: { opening: Opening }) {
  const apply = useEditorStore((s) => s.apply)
  const update = (patch: OpeningPatch) => apply((s) => updateOpening(s, opening.id, patch))
  const isDoor = opening.type === 'door'

  return (
    <>
      <h2>{isDoor ? 'Vrata' : 'Okno'}</h2>
      <NumberField
        label="Odmik od začetka stene"
        value={opening.offset}
        onCommit={(v) => update({ offset: v })}
      />
      <NumberField label="Širina" value={opening.width} onCommit={(v) => update({ width: v })} />
      <NumberField label="Višina" value={opening.height} onCommit={(v) => update({ height: v })} />
      <NumberField
        label="Parapet"
        value={opening.sillHeight}
        disabled={isDoor}
        onCommit={(v) => update({ sillHeight: v })}
      />
      <p className="muted small">Odmik se meri od začetka stene do bližjega roba odprtine.</p>
      <button type="button" onClick={() => apply((s) => removeOpening(s, opening.id))}>
        Izbriši {isDoor ? 'vrata' : 'okno'}
      </button>
    </>
  )
}
