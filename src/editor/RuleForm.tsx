import { CROSSING_ELEMENTS } from '../core/parseRules'
import { OBSTACLE_CATEGORIES } from '../core/parseSpace'
import type { CrossingElement, ObstacleCategory, RoutingRule, Scene } from '../core/scene'
import { NumberField } from './NumberField'
import { CATEGORY_LABELS, CROSSING_LABELS } from './ruleTexts'
import { TextField } from './TextField'

interface Props {
  scene: Scene
  rule: RoutingRule
  /** Saves the changed rule; returns false when it was rejected. */
  onChange: (rule: RoutingRule) => boolean
}

function SystemSelect({
  label,
  value,
  scene,
  allowAll,
  onChange,
}: {
  label: string
  value: string | null
  scene: Scene
  allowAll: boolean
  onChange: (id: string | null) => void
}) {
  const id = `rule-${label.replace(/\W+/g, '-')}`
  const known = value === null || scene.settings.systems.some((s) => s.id === value)
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? null : e.target.value)}
      >
        <option value="">{allowAll ? 'vsi sistemi' : '— izberi —'}</option>
        {scene.settings.systems.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
        {!known && <option value={value}>neznan sistem ({value})</option>}
      </select>
    </div>
  )
}

/** Fields of one rule. Values stay empty until the user enters them. */
export function RuleForm({ scene, rule, onChange }: Props) {
  const set = (patch: Partial<RoutingRule>) => onChange({ ...rule, ...patch } as RoutingRule)
  const length = (label: string, value: number | null, key: string) => (
    <NumberField
      label={label}
      value={value}
      onCommit={(v) => set({ [key]: v } as Partial<RoutingRule>)}
      onClear={() => set({ [key]: null } as Partial<RoutingRule>)}
    />
  )

  return (
    <div className="rule-form">
      <TextField label="Vir (obvezno)" value={rule.source} onCommit={(source) => set({ source })} />
      {rule.kind === 'maxBends' ? (
        <p className="muted small">To pravilo je vedno samo opozorilo.</p>
      ) : (
        <div className="field">
          <label htmlFor="rule-hard">Vrsta</label>
          <select
            id="rule-hard"
            value={rule.hard ? 'hard' : 'soft'}
            onChange={(e) => set({ hard: e.target.value === 'hard' })}
          >
            <option value="hard">prepoved (speljevanje je ne krši)</option>
            <option value="soft">kazen (speljevanje se ji izogiba)</option>
          </select>
        </div>
      )}

      {rule.kind === 'minSpacing' && (
        <>
          <SystemSelect
            label="Sistem A"
            value={rule.systemA}
            scene={scene}
            allowAll
            onChange={(systemA) => set({ systemA })}
          />
          <SystemSelect
            label="Sistem B"
            value={rule.systemB}
            scene={scene}
            allowAll
            onChange={(systemB) => set({ systemB })}
          />
          {length('Najmanjši razmik (med površinama)', rule.distance, 'distance')}
        </>
      )}

      {rule.kind === 'verticalOrder' && (
        <>
          <SystemSelect
            label="Zgoraj"
            value={rule.upper}
            scene={scene}
            allowAll={false}
            onChange={(upper) => set({ upper })}
          />
          <SystemSelect
            label="Spodaj"
            value={rule.lower}
            scene={scene}
            allowAll={false}
            onChange={(lower) => set({ lower })}
          />
          {length('Vzporedno do (razdalja osi v tlorisu)', rule.parallelWithin, 'parallelWithin')}
        </>
      )}

      {rule.kind === 'obstacleDistance' && (
        <>
          <SystemSelect
            label="Sistem"
            value={rule.systemId}
            scene={scene}
            allowAll
            onChange={(systemId) => set({ systemId })}
          />
          <div className="field">
            <label htmlFor="rule-category">Kategorija ovir</label>
            <select
              id="rule-category"
              value={rule.category}
              onChange={(e) => set({ category: e.target.value as ObstacleCategory })}
            >
              {OBSTACLE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </div>
          {length('Najmanjši razmik od ovire', rule.distance, 'distance')}
        </>
      )}

      {rule.kind === 'heightRange' && (
        <>
          <SystemSelect
            label="Sistem"
            value={rule.systemId}
            scene={scene}
            allowAll
            onChange={(systemId) => set({ systemId })}
          />
          {length('Najnižja višina osi', rule.min, 'min')}
          {length('Najvišja višina osi', rule.max, 'max')}
          <p className="muted small">Velja za vodoravne odseke; ena meja je lahko prazna.</p>
        </>
      )}

      {rule.kind === 'noCrossing' && (
        <>
          <SystemSelect
            label="Sistem"
            value={rule.systemId}
            scene={scene}
            allowAll
            onChange={(systemId) => set({ systemId })}
          />
          <div className="field">
            <label htmlFor="rule-element">Ne skozi</label>
            <select
              id="rule-element"
              value={rule.element}
              onChange={(e) => set({ element: e.target.value as CrossingElement })}
            >
              {CROSSING_ELEMENTS.map((c) => (
                <option key={c} value={c}>
                  {CROSSING_LABELS[c]}
                </option>
              ))}
            </select>
          </div>
        </>
      )}

      {rule.kind === 'maxBends' && (
        <>
          <SystemSelect
            label="Sistem"
            value={rule.systemId}
            scene={scene}
            allowAll
            onChange={(systemId) => set({ systemId })}
          />
          <NumberField
            label="Največ kolen na cev"
            unit=""
            value={rule.max}
            onCommit={(max) => set({ max })}
            onClear={() => set({ max: null })}
          />
        </>
      )}
    </div>
  )
}
