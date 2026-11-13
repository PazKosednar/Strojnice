import { PORT_DIRECTIONS } from '../core/equipmentType'
import type { PortDirection, SystemDef } from '../core/scene'
import type { DraftErrors, PortDraft } from './typeDraft'

const DIRECTION_LABELS: Record<PortDirection, string> = {
  '+x': '+x (desno)',
  '-x': '−x (levo)',
  '+y': '+y (zadaj)',
  '-y': '−y (spredaj)',
  '+z': '+z (gor)',
  '-z': '−z (dol)',
}

interface Props {
  ports: PortDraft[]
  systems: readonly SystemDef[]
  errors: DraftErrors
  onChange: (ports: PortDraft[]) => void
  onAdd: () => void
}

/** Editable table of ports: name, system, local position, direction and size text. */
export function PortsTable({ ports, systems, errors, onChange, onAdd }: Props) {
  const update = (index: number, patch: Partial<PortDraft>) =>
    onChange(ports.map((p, i) => (i === index ? { ...p, ...patch } : p)))
  const invalid = (index: number, field: string) =>
    errors[`ports.${index}.${field}`] ? true : undefined

  return (
    <div className="ports-table">
      {ports.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Ime</th>
              <th>Sistem</th>
              <th>x</th>
              <th>y</th>
              <th>z</th>
              <th>Smer</th>
              <th>Dimenzija</th>
              <th>⌀ zun. (mm)</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {ports.map((port, i) => {
              const n = i + 1
              // Keep a system that no longer exists in this project selectable.
              const knownSystem = systems.some((s) => s.id === port.systemId)
              return (
                <tr key={port.id}>
                  <td>
                    <input
                      aria-label={`Ime priključka ${n}`}
                      aria-invalid={invalid(i, 'name')}
                      value={port.name}
                      onChange={(e) => update(i, { name: e.target.value })}
                    />
                  </td>
                  <td>
                    <select
                      aria-label={`Sistem priključka ${n}`}
                      aria-invalid={invalid(i, 'systemId')}
                      value={port.systemId}
                      onChange={(e) => update(i, { systemId: e.target.value })}
                    >
                      {!knownSystem && (
                        <option value={port.systemId}>
                          {port.systemId === '' ? '— izberi —' : `${port.systemId} (ni v projektu)`}
                        </option>
                      )}
                      {systems.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  {(['x', 'y', 'z'] as const).map((axis) => (
                    <td key={axis}>
                      <input
                        className="coordinate"
                        inputMode="numeric"
                        aria-label={`${axis} priključka ${n}`}
                        aria-invalid={invalid(i, axis)}
                        value={port[axis]}
                        onChange={(e) => update(i, { [axis]: e.target.value })}
                      />
                    </td>
                  ))}
                  <td>
                    <select
                      aria-label={`Smer priključka ${n}`}
                      value={port.direction}
                      onChange={(e) => update(i, { direction: e.target.value as PortDirection })}
                    >
                      {PORT_DIRECTIONS.map((d) => (
                        <option key={d} value={d}>
                          {DIRECTION_LABELS[d]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      className="size"
                      aria-label={`Dimenzija priključka ${n}`}
                      value={port.size}
                      onChange={(e) => update(i, { size: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      className="coordinate"
                      inputMode="numeric"
                      aria-label={`Zunanji premer priključka ${n}`}
                      aria-invalid={invalid(i, 'outerDiameter')}
                      value={port.outerDiameter}
                      onChange={(e) => update(i, { outerDiameter: e.target.value })}
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      aria-label={`Izbriši priključek ${n}`}
                      onClick={() => onChange(ports.filter((_, j) => j !== i))}
                    >
                      ×
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
      <button type="button" onClick={onAdd}>
        Dodaj priključek
      </button>
      <p className="muted small">
        Položaj je v mm v koordinatah naprave: izhodišče je središče tlorisa na spodnjem robu, x
        desno (gledano od spredaj), +y proti hrbtni strani, z navzgor. Smer pove, kam cev zapusti
        napravo. Dimenzija je prosto besedilo (npr. DN25) in se ne preverja. Zunanji premer cevi
        vneseš iz dokumentacije; brez njega priključka ni mogoče povezati.
      </p>
    </div>
  )
}
