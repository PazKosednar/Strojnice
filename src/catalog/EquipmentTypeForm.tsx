import { useId, useState, type ReactNode, type SubmitEvent } from 'react'
import type { EquipmentType, Mounting, SystemDef } from '../core/scene'
import { newId } from '../editor/newId'
import { ModelSection } from './ModelSection'
import { PortsTable } from './PortsTable'
import {
  draftToType,
  emptyPortDraft,
  previewType,
  type ClearanceSideKey,
  type DraftErrors,
  type TypeDraft,
} from './typeDraft'
import { TypePreview } from './TypePreview'

interface Props {
  title: string
  initial: TypeDraft
  /** Systems of the current project (used for port colours and the system list). */
  systems: readonly SystemDef[]
  onSave: (type: EquipmentType) => Promise<boolean>
  onCancel: () => void
}

interface FieldProps {
  label: string
  error?: string
  unit?: string
  children: (id: string) => ReactNode
}

function Field({ label, error, unit, children }: FieldProps) {
  const id = useId()
  return (
    <div className="form-field">
      <label htmlFor={id}>{label}</label>
      <span className="field-input">
        {children(id)}
        {unit && <span className="unit">{unit}</span>}
      </span>
      {error && <span className="error small">{error}</span>}
    </div>
  )
}

const CLEARANCE_LABELS: Record<ClearanceSideKey, string> = {
  front: 'Spredaj',
  back: 'Zadaj',
  left: 'Levo',
  right: 'Desno',
  top: 'Zgoraj',
}

/** Form for an equipment type with a live preview. All dimensions are typed in by the user. */
export function EquipmentTypeForm({ title, initial, systems, onSave, onCancel }: Props) {
  const [draft, setDraft] = useState(initial)
  const [errors, setErrors] = useState<DraftErrors>({})
  const [busy, setBusy] = useState(false)
  const set = (patch: Partial<TypeDraft>) => {
    setDraft((d) => ({ ...d, ...patch }))
    // Editing a field clears its message; the whole form is checked again on save.
    setErrors((current) => {
      const changed = Object.keys(patch).flatMap((key) =>
        key === 'clearances' || key === 'ports' ? [`${key}.`] : [key],
      )
      const remaining = Object.fromEntries(
        Object.entries(current).filter(
          ([key]) => !changed.some((c) => (c.endsWith('.') ? key.startsWith(c) : key === c)),
        ),
      )
      return Object.keys(remaining).length === Object.keys(current).length ? current : remaining
    })
  }

  const submit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()
    const result = draftToType(draft)
    if (!result.ok) return setErrors(result.errors)
    setErrors({})
    setBusy(true)
    const saved = await onSave(result.type)
    if (!saved) setBusy(false)
  }

  const numberInput = (field: 'width' | 'depth' | 'diameter' | 'height', label: string) => (
    <Field label={label} unit="mm" error={errors[field]}>
      {(id) => (
        <input
          id={id}
          inputMode="numeric"
          required
          aria-invalid={errors[field] ? true : undefined}
          value={draft[field]}
          onChange={(e) => set({ [field]: e.target.value })}
        />
      )}
    </Field>
  )

  const errorCount = Object.keys(errors).length

  return (
    <div className="dialog-backdrop">
      <form
        className="type-dialog"
        role="dialog"
        aria-label={title}
        onSubmit={(e) => void submit(e)}
        noValidate
      >
        <h2>{title}</h2>
        <div className="type-dialog-body">
          <div className="type-form">
            <Field label="Ime tipa" error={errors.name}>
              {(id) => (
                <input id={id} value={draft.name} onChange={(e) => set({ name: e.target.value })} />
              )}
            </Field>
            <Field label="Predpona oznake" error={errors.tagPrefix}>
              {(id) => (
                <input
                  id={id}
                  className="short"
                  value={draft.tagPrefix}
                  onChange={(e) => set({ tagPrefix: e.target.value })}
                />
              )}
            </Field>
            <Field label="Oblika">
              {(id) => (
                <select
                  id={id}
                  value={draft.shapeKind}
                  onChange={(e) => set({ shapeKind: e.target.value as TypeDraft['shapeKind'] })}
                >
                  <option value="box">Kvader</option>
                  <option value="cylinder">Valj (pokončen)</option>
                </select>
              )}
            </Field>
            <Field label="Montaža">
              {(id) => (
                <select
                  id={id}
                  value={draft.mounting}
                  onChange={(e) => set({ mounting: e.target.value as Mounting })}
                >
                  <option value="floor">Talna</option>
                  <option value="wall">Stenska</option>
                </select>
              )}
            </Field>

            <h3>Mere (iz dokumentacije proizvajalca)</h3>
            {draft.shapeKind === 'box' ? (
              <>
                {numberInput('width', 'Širina')}
                {numberInput('depth', 'Globina')}
              </>
            ) : (
              numberInput('diameter', 'Premer')
            )}
            {numberInput('height', 'Višina')}

            <h3>3D model proizvajalca (neobvezno)</h3>
            <ModelSection
              typeId={draft.id}
              model={draft.model}
              onChange={(model) => set({ model })}
              onUseDimensions={({ width, depth, height }) =>
                draft.shapeKind === 'box'
                  ? set({ width: String(width), depth: String(depth), height: String(height) })
                  : set({ diameter: String(Math.max(width, depth)), height: String(height) })
              }
            />

            <h3>Servisni odmiki (neobvezno)</h3>
            {(Object.keys(CLEARANCE_LABELS) as ClearanceSideKey[]).map((side) => (
              <Field
                key={side}
                label={CLEARANCE_LABELS[side]}
                unit="mm"
                error={errors[`clearances.${side}`]}
              >
                {(id) => (
                  <input
                    id={id}
                    inputMode="numeric"
                    aria-label={`Odmik ${CLEARANCE_LABELS[side].toLowerCase()}`}
                    value={draft.clearances[side]}
                    onChange={(e) =>
                      set({ clearances: { ...draft.clearances, [side]: e.target.value } })
                    }
                  />
                )}
              </Field>
            ))}
          </div>

          <div className="type-side">
            <TypePreview type={previewType(draft)} systems={systems} />
          </div>
        </div>

        <h3>Priključki</h3>
        <PortsTable
          ports={draft.ports}
          systems={systems}
          errors={errors}
          onChange={(ports) => set({ ports })}
          onAdd={() =>
            set({ ports: [...draft.ports, emptyPortDraft(newId(), systems[0]?.id ?? '')] })
          }
        />

        {errorCount > 0 && (
          <p className="error" role="alert">
            Obrazec ima napake ({errorCount}). Popravi označena polja.
            {Object.entries(errors)
              .filter(([key]) => key.startsWith('ports.'))
              .slice(0, 1)
              .map(([, message]) => ` Priključki: ${message}`)}
          </p>
        )}
        <div className="dialog-actions">
          <button type="submit" disabled={busy}>
            Shrani tip
          </button>
          <button type="button" onClick={onCancel} disabled={busy}>
            Prekliči
          </button>
        </div>
      </form>
    </div>
  )
}
