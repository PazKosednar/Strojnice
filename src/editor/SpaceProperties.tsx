import { removeObstacle, updateObstacle, type ObstaclePatch } from '../core/obstacleOps'
import { OBSTACLE_CATEGORIES, ZONE_KINDS } from '../core/parseSpace'
import type { Obstacle, ObstacleCategory, PlanBox, Zone, ZoneKind } from '../core/scene'
import { removeZone, updateZone, type ZonePatch } from '../core/zoneOps'
import { useEditorStore } from '../stores/editorStore'
import { NumberField } from './NumberField'
import { CATEGORY_LABELS, ZONE_KIND_LABELS } from './ruleTexts'
import { TextField } from './TextField'

/** Position, size, turn and heights of an obstacle or zone (whole mm). */
function BoxFields({
  box,
  onChange,
}: {
  box: PlanBox
  onChange: (patch: Partial<PlanBox>) => boolean
}) {
  return (
    <>
      <NumberField
        label="X"
        value={box.center.x}
        onCommit={(x) => onChange({ center: { ...box.center, x } })}
      />
      <NumberField
        label="Y"
        value={box.center.y}
        onCommit={(y) => onChange({ center: { ...box.center, y } })}
      />
      <NumberField label="Širina" value={box.width} onCommit={(width) => onChange({ width })} />
      <NumberField label="Globina" value={box.depth} onCommit={(depth) => onChange({ depth })} />
      <NumberField
        label="Zasuk"
        unit="°"
        value={box.rotation}
        onCommit={(rotation) => onChange({ rotation })}
      />
      <NumberField
        label="Spodnja višina"
        value={box.bottom}
        onCommit={(bottom) => onChange({ bottom })}
      />
      <NumberField label="Višina" value={box.height} onCommit={(height) => onChange({ height })} />
    </>
  )
}

export function ObstacleProperties({ obstacle }: { obstacle: Obstacle }) {
  const apply = useEditorStore((s) => s.apply)
  const update = (patch: ObstaclePatch) => apply((s) => updateObstacle(s, obstacle.id, patch))
  return (
    <>
      <h2>Ovira</h2>
      <TextField label="Oznaka" value={obstacle.tag} onCommit={(tag) => update({ tag })} />
      <TextField label="Ime" value={obstacle.name} onCommit={(name) => update({ name })} />
      <div className="field">
        <label htmlFor="obstacle-category">Kategorija</label>
        <select
          id="obstacle-category"
          value={obstacle.category}
          onChange={(e) => update({ category: e.target.value as ObstacleCategory })}
        >
          {OBSTACLE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
      </div>
      <BoxFields box={obstacle} onChange={update} />
      <p className="muted small">
        Tuja inštalacija ali element prostora. Cevi ji ne smejo skozi; razmik od ovir določijo
        pravila projekta.
      </p>
      <button type="button" onClick={() => apply((s) => removeObstacle(s, obstacle.id))}>
        Izbriši oviro
      </button>
    </>
  )
}

export function ZoneProperties({ zone }: { zone: Zone }) {
  const apply = useEditorStore((s) => s.apply)
  const update = (patch: ZonePatch) => apply((s) => updateZone(s, zone.id, patch))
  return (
    <>
      <h2>Cona</h2>
      <TextField label="Ime" value={zone.name} onCommit={(name) => update({ name })} />
      <div className="field">
        <label htmlFor="zone-kind">Vrsta</label>
        <select
          id="zone-kind"
          value={zone.kind}
          onChange={(e) => update({ kind: e.target.value as ZoneKind })}
        >
          {ZONE_KINDS.map((k) => (
            <option key={k} value={k}>
              {ZONE_KIND_LABELS[k]}
            </option>
          ))}
        </select>
      </div>
      <BoxFields box={zone} onChange={update} />
      <button type="button" onClick={() => apply((s) => removeZone(s, zone.id))}>
        Izbriši cono
      </button>
    </>
  )
}
