import { useState, type ChangeEvent } from 'react'
import { modelDimensions } from '../core/modelDimensions'
import type { EquipmentModel, ModelRotation } from '../core/scene'
import { actionErrorMessage } from '../lib/errors'
import { MAX_MODEL_BYTES, uploadModel } from '../lib/modelsApi'
import { useAuthStore } from '../stores/authStore'
import { measureGlb } from './measureModel'

interface Props {
  typeId: string
  model: EquipmentModel | undefined
  onChange: (model: EquipmentModel | undefined) => void
  /** Offers the model's dimensions to the form (the user saves them with the type). */
  onUseDimensions: (dimensions: { width: number; depth: number; height: number }) => void
}

const ROTATIONS: { value: ModelRotation; label: string }[] = [
  { value: 0, label: '0° (sprednja stran modela je spredaj)' },
  { value: 90, label: '90°' },
  { value: 180, label: '180°' },
  { value: 270, label: '270°' },
]

/**
 * Optional manufacturer 3D model (.glb) of an equipment type: upload, front orientation
 * and an offer to take over its dimensions. The model is only drawn in 3D; ports and
 * clearances are still entered in the form.
 */
export function ModelSection({ typeId, model, onChange, onUseDimensions }: Props) {
  const userId = useAuthStore((s) => s.session?.user.id)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const choose = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !userId) return
    setError(null)
    if (!file.name.toLowerCase().endsWith('.glb')) return setError('Izberi datoteko .glb.')
    if (file.size > MAX_MODEL_BYTES) return setError('Datoteka je večja od 20 MB.')
    setBusy(true)
    try {
      const bounds = await measureGlb(file)
      const path = await uploadModel(userId, typeId, file)
      onChange({ path, fileName: file.name, rotation: model?.rotation ?? 0, bounds })
    } catch (err) {
      setError(actionErrorMessage('Modela ni bilo mogoče naložiti', err))
    } finally {
      setBusy(false)
    }
  }

  const size = model && modelDimensions(model.bounds, model.rotation)

  return (
    <div className="model-section">
      <label className="file-button">
        {model ? 'Zamenjaj model (.glb)' : 'Naloži model (.glb)'}
        <input
          type="file"
          accept=".glb,model/gltf-binary"
          aria-label="3D model naprave"
          disabled={busy}
          onChange={(e) => void choose(e)}
        />
      </label>
      {busy && <span className="muted small"> Nalagam in merim model …</span>}
      {error && (
        <p className="error small" role="alert">
          {error}
        </p>
      )}
      {model && size && (
        <>
          <p className="small">
            <strong>{model.fileName}</strong> · {size.width} × {size.depth} × {size.height} mm (š ×
            g × v)
          </p>
          <div className="form-field">
            <label htmlFor={`model-rotation-${typeId}`}>Zasuk modela</label>
            <select
              id={`model-rotation-${typeId}`}
              value={model.rotation}
              onChange={(e) =>
                onChange({ ...model, rotation: Number(e.target.value) as ModelRotation })
              }
            >
              {ROTATIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <p className="row">
            <button type="button" onClick={() => onUseDimensions(size)}>
              Prevzemi mere iz modela
            </button>
            <button type="button" onClick={() => onChange(undefined)}>
              Odstrani model
            </button>
          </p>
          <p className="muted small">
            Zasuk nastavi tako, da je sprednja stran modela obrnjena naprej (proti priključkom
            spredaj, −y). Model je samo slika: mere, priključki in odmiki veljajo iz obrazca.
          </p>
        </>
      )}
    </div>
  )
}
