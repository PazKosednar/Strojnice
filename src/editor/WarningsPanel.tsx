import type { Scene } from '../core/scene'
import type { SceneWarning } from '../core/sceneWarnings'
import { useEditorStore } from '../stores/editorStore'
import { warningText } from './warningMessages'

interface Props {
  scene: Scene
  warnings: readonly SceneWarning[]
}

/** List of collisions, clearance violations and unknown systems; a click selects the equipment. */
export function WarningsPanel({ scene, warnings }: Props) {
  const select = useEditorStore((s) => s.select)
  return (
    <div className="warnings">
      <h2>Opozorila</h2>
      {warnings.length === 0 ? (
        <p className="muted">Ni opozoril.</p>
      ) : (
        <>
          <p className="muted small">
            Opozorila ne preprečujejo dela: naprava je lahko namenoma zunaj prostora ali tik ob
            drugi. Klik izbere napravo.
          </p>
          <ul className="warning-list">
            {warnings.map((warning, i) => (
              <li key={i}>
                <button
                  type="button"
                  className="link"
                  onClick={() => select({ kind: 'equipment', id: warning.equipmentId })}
                >
                  {warningText(warning, scene)}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
