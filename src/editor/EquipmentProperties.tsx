import {
  removeEquipment,
  rotateEquipment,
  updateEquipment,
  type EquipmentPatch,
} from '../core/equipmentOps'
import { UNKNOWN_SYSTEM_COLOR } from '../core/equipmentTo3d'
import type { Equipment, SystemDef } from '../core/scene'
import { setPortDiameter } from '../core/pipeOps'
import { useEditorStore } from '../stores/editorStore'
import { duplicateSelected } from './equipmentActions'
import { NumberField } from './NumberField'
import { TextField } from './TextField'

interface Props {
  equipment: Equipment
  systems: readonly SystemDef[]
}

export function EquipmentProperties({ equipment, systems }: Props) {
  const apply = useEditorStore((s) => s.apply)
  const update = (patch: EquipmentPatch) => apply((s) => updateEquipment(s, equipment.id, patch))
  const { type } = equipment
  const { shape } = type
  const c = type.clearances

  return (
    <>
      <h2>Naprava</h2>
      <TextField label="Oznaka" value={equipment.tag} onCommit={(tag) => update({ tag })} />
      <NumberField
        label="X"
        value={equipment.position.x}
        onCommit={(x) => update({ position: { ...equipment.position, x } })}
      />
      <NumberField
        label="Y"
        value={equipment.position.y}
        onCommit={(y) => update({ position: { ...equipment.position, y } })}
      />
      <NumberField
        label="Višina od tal"
        value={equipment.elevation}
        onCommit={(elevation) => update({ elevation })}
      />
      <NumberField
        label="Rotacija"
        unit="°"
        value={equipment.rotation}
        onCommit={(rotation) => update({ rotation })}
      />
      <p className="row">
        <button type="button" onClick={() => apply((s) => rotateEquipment(s, equipment.id, 90))}>
          Zasukaj 90°
        </button>
        <button type="button" onClick={() => duplicateSelected(equipment.id)}>
          Podvoji
        </button>
        <button type="button" onClick={() => apply((s) => removeEquipment(s, equipment.id))}>
          Izbriši
        </button>
      </p>

      <h3>Tip</h3>
      <dl className="info">
        <dt>Ime</dt>
        <dd>{type.name}</dd>
        <dt>Montaža</dt>
        <dd>{type.mounting === 'wall' ? 'stenska' : 'talna'}</dd>
        <dt>Mere</dt>
        <dd>
          {shape.kind === 'box'
            ? `${shape.width} × ${shape.depth} × ${shape.height} mm (š × g × v)`
            : `⌀ ${shape.diameter} × ${shape.height} mm`}
        </dd>
        {c && (
          <>
            <dt>Odmiki</dt>
            <dd>
              spredaj {c.front}, zadaj {c.back}, levo {c.left}, desno {c.right}, zgoraj {c.top} mm
            </dd>
          </>
        )}
      </dl>
      <p className="muted small">
        Mere so kopija tipa ob postavitvi. Spremeniš jih v katalogu in napravo postaviš znova.
        Zunanji premer cevi na priključku vneseš tukaj (velja za to napravo v projektu).
      </p>

      <h3>Priključki ({type.ports.length})</h3>
      {type.ports.length === 0 ? (
        <p className="muted small">Tip nima priključkov.</p>
      ) : (
        <ul className="port-list">
          {type.ports.map((port) => {
            const system = systems.find((s) => s.id === port.systemId)
            return (
              <li key={port.id}>
                <span
                  className="swatch"
                  style={{ background: system?.color ?? UNKNOWN_SYSTEM_COLOR }}
                />
                <span>
                  <strong>{port.name}</strong> {port.size}
                  <br />
                  <span className="muted small">
                    {system?.name ?? 'neznan sistem'} · ({port.position.x}, {port.position.y},{' '}
                    {port.position.z}) · {port.direction.replace('-', '−')}
                  </span>
                  {port.outerDiameter === undefined && (
                    <span className="error small"> Manjka zunanji premer cevi.</span>
                  )}
                  <NumberField
                    label={`Zunanji premer ${port.name}`}
                    value={port.outerDiameter ?? null}
                    onCommit={(d) => apply((s) => setPortDiameter(s, equipment.id, port.id, d))}
                  />
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
