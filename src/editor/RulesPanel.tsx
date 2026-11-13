import { useState } from 'react'
import { RULE_KINDS } from '../core/parseRules'
import { addRule, newRule, removeRule, updateRule } from '../core/ruleOps'
import { ruleStatus } from '../core/rules/ruleStatus'
import type { RuleKind, Scene } from '../core/scene'
import { useEditorStore } from '../stores/editorStore'
import { newId } from './newId'
import { RuleForm } from './RuleForm'
import { RULE_KIND_LABELS, RULE_STATUS_LABELS, ruleSummary } from './ruleTexts'

/**
 * Project rules: the app contains no regulations; every rule is entered by the user with
 * its source and takes effect only with a source and all its values.
 */
export function RulesPanel({ scene }: { scene: Scene }) {
  const apply = useEditorStore((s) => s.apply)
  const [kind, setKind] = useState<RuleKind>('minSpacing')
  const [openId, setOpenId] = useState<string | null>(null)

  const add = () => {
    const id = newId()
    if (apply((s) => addRule(s, newRule(kind, id)))) setOpenId(id)
  }

  return (
    <div className="rules">
      <h2>Pravila projekta</h2>
      <p className="muted small">
        Aplikacija ne vsebuje predpisov. Pravila vneseš sam, vsako z virom (standard s točko,
        projektna naloga, interna praksa). Pravilo brez vira ali vrednosti ni aktivno. Prepoved
        upošteva speljevanje, kazen ga le podraži; kršitve so med opozorili.
      </p>
      <div className="row">
        <select
          aria-label="Vrsta novega pravila"
          value={kind}
          onChange={(e) => setKind(e.target.value as RuleKind)}
        >
          {RULE_KINDS.map((k) => (
            <option key={k} value={k}>
              {RULE_KIND_LABELS[k]}
            </option>
          ))}
        </select>
        <button type="button" onClick={add}>
          Dodaj pravilo
        </button>
      </div>
      {scene.rules.length === 0 && <p className="muted">Ni pravil.</p>}
      <ul className="rule-list">
        {scene.rules.map((rule) => {
          const status = ruleStatus(scene, rule)
          const open = openId === rule.id
          return (
            <li
              key={rule.id}
              data-testid={`rule-${rule.id}`}
              className={status === 'effective' ? undefined : 'rule-off'}
            >
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={rule.active}
                  aria-label={`Vklopljeno: ${ruleSummary(scene, rule)}`}
                  onChange={(e) =>
                    apply((s) => updateRule(s, { ...rule, active: e.target.checked }))
                  }
                />
                <strong>{ruleSummary(scene, rule)}</strong>
              </label>
              <span className="small muted">Vir: {rule.source || '—'}</span>
              <span className={`rule-status${status === 'effective' ? ' effective' : ''}`}>
                {RULE_STATUS_LABELS[status]}
              </span>
              <span className="row">
                <button type="button" onClick={() => setOpenId(open ? null : rule.id)}>
                  {open ? 'Zapri' : 'Uredi'}
                </button>
                <button type="button" onClick={() => apply((s) => removeRule(s, rule.id))}>
                  Izbriši
                </button>
              </span>
              {open && (
                <RuleForm
                  scene={scene}
                  rule={rule}
                  onChange={(next) => apply((s) => updateRule(s, next))}
                />
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
