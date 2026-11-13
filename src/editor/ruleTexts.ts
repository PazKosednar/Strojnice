import type { RuleStatus } from '../core/rules/ruleStatus'
import type { RuleViolation } from '../core/rules/violation'
import type { CrossingElement, ObstacleCategory, RoutingRule, RuleKind, Scene } from '../core/scene'

export const RULE_KIND_LABELS: Record<RuleKind, string> = {
  minSpacing: 'Najmanjši razmik med sistemoma',
  verticalOrder: 'Vrstni red po višini',
  obstacleDistance: 'Razmik od ovir',
  heightRange: 'Območje višine',
  noCrossing: 'Prepoved prečkanja',
  maxBends: 'Največ kolen na cev',
}

export const CATEGORY_LABELS: Record<ObstacleCategory, string> = {
  electrical: 'elektro',
  duct: 'kanal',
  structure: 'konstrukcija',
  other: 'drugo',
}

export const CROSSING_LABELS: Record<CrossingElement, string> = {
  door: 'vrata',
  window: 'okno',
  wall: 'stena',
}

export const RULE_STATUS_LABELS: Record<RuleStatus, string> = {
  effective: 'Aktivno',
  inactive: 'Izklopljeno',
  noSource: 'Ni aktivno: manjka vir.',
  missingValue: 'Ni aktivno: manjka vrednost.',
  unknownSystem: 'Ni aktivno: sistem ne obstaja več.',
}

export function systemName(scene: Scene, id: string | null): string {
  if (id === null) return 'vsi sistemi'
  return scene.settings.systems.find((s) => s.id === id)?.name ?? `neznan sistem (${id})`
}

/** One-line summary of a rule, e.g. "Razmik od ovir: Hladna voda – elektro ≥ 300 mm". */
export function ruleSummary(scene: Scene, rule: RoutingRule): string {
  const mm = (v: number | null) => (v === null ? '… mm' : `${v} mm`)
  const label = RULE_KIND_LABELS[rule.kind]
  switch (rule.kind) {
    case 'minSpacing':
      return `${label}: ${systemName(scene, rule.systemA)} – ${systemName(scene, rule.systemB)} ≥ ${mm(rule.distance)}`
    case 'verticalOrder':
      return `${label}: ${systemName(scene, rule.upper)} nad ${systemName(scene, rule.lower)} (vzporedno do ${mm(rule.parallelWithin)})`
    case 'obstacleDistance':
      return `${label}: ${systemName(scene, rule.systemId)} – ${CATEGORY_LABELS[rule.category]} ≥ ${mm(rule.distance)}`
    case 'heightRange':
      return `${label}: ${systemName(scene, rule.systemId)} od ${mm(rule.min)} do ${mm(rule.max)}`
    case 'noCrossing':
      return `${label}: ${systemName(scene, rule.systemId)} ne skozi ${CROSSING_LABELS[rule.element]}`
    case 'maxBends':
      return `${label}: ${systemName(scene, rule.systemId)} ≤ ${rule.max ?? '…'}`
  }
}

/**
 * Slovenian text of a rule violation with the measured and required value and the rule's
 * source. `label` gives a pipe's ends (e.g. "HP-01 / A → IDU-01 / C") or "?".
 */
export function violationText(
  scene: Scene,
  v: RuleViolation,
  label: (pipeId: string) => string,
): string {
  const kind = v.hard ? 'prepoved' : 'priporočilo'
  const source = `(${kind}; vir: ${v.source})`
  const first = `Cev ${label(v.pipeIds[0]!)}`
  const other = v.pipeIds[1] ? label(v.pipeIds[1]) : '?'
  switch (v.kind) {
    case 'minSpacing':
      return `${first} in cev ${other}: razmik ${v.measured} mm, zahtevano najmanj ${v.required} mm ${source}.`
    case 'verticalOrder': {
      const where = v.measured === 0 ? 'v isti višini kot' : `${Math.abs(v.measured)} mm pod`
      return `${first} poteka ${where} cevjo ${other}; zahtevano je, da poteka nad njo ${source}.`
    }
    case 'obstacleDistance': {
      const tag = scene.obstacles.find((o) => o.id === v.obstacleId)?.tag ?? '?'
      return `${first}: razmik do ovire ${tag} je ${v.measured} mm, zahtevano najmanj ${v.required} mm ${source}.`
    }
    case 'heightRange':
      return v.bound === 'min'
        ? `${first}: vodoravni odsek na višini ${v.measured} mm, dovoljeno najmanj ${v.required} mm ${source}.`
        : `${first}: vodoravni odsek na višini ${v.measured} mm, dovoljeno največ ${v.required} mm ${source}.`
    case 'noCrossing': {
      const element = v.crossing ? CROSSING_LABELS[v.crossing.element] : 'element'
      return `${first} gre skozi ${element}, kar pravilo prepoveduje ${source}.`
    }
    case 'maxBends':
      return `${first}: ${v.measured} kolen, dovoljeno največ ${v.required} ${source}.`
  }
}
