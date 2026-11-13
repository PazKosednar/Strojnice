import type { LineStyle } from '../core/scene'
import { selectScene, useEditorStore } from '../stores/editorStore'

const DASH: Record<LineStyle, string | undefined> = {
  solid: undefined,
  dashed: '6 3',
  dashdot: '7 2 1.5 2',
}

/** Legend of systems with a visibility switch per system (applies to 2D and 3D). */
export function SystemLegend() {
  const systems = useEditorStore((s) => selectScene(s).settings.systems)
  const hidden = useEditorStore((s) => s.hiddenSystems)
  const toggle = useEditorStore((s) => s.toggleSystem)
  const showAll = useEditorStore((s) => s.showAllSystems)

  return (
    <div className="legend" role="group" aria-label="Legenda sistemov">
      <button type="button" aria-pressed={hidden.length === 0} onClick={showAll}>
        Vsi
      </button>
      {systems.map((system) => {
        const visible = !hidden.includes(system.id)
        return (
          <button
            key={system.id}
            type="button"
            aria-pressed={visible}
            className={`legend-item${visible ? '' : ' off'}`}
            title={visible ? 'Skrij sistem' : 'Pokaži sistem'}
            onClick={() => toggle(system.id)}
          >
            <svg width="26" height="10" aria-hidden="true">
              <line
                x1="1"
                y1="5"
                x2="25"
                y2="5"
                stroke={system.color}
                strokeWidth="3"
                strokeDasharray={DASH[system.lineStyle]}
              />
            </svg>
            {system.name}
          </button>
        )
      })}
    </div>
  )
}
