import { OBSTACLE_CATEGORIES, ZONE_KINDS } from '../core/parseSpace'
import type { ObstacleCategory, ZoneKind } from '../core/scene'
import { useEditorStore } from '../stores/editorStore'
import { CATEGORY_LABELS, ZONE_KIND_LABELS } from './ruleTexts'

/** What the obstacle / zone tool draws next. */
export function SpaceDraftForm({ kind }: { kind: 'obstacle' | 'zone' }) {
  const draft = useEditorStore((s) => s.spaceDraft)
  const setDraft = useEditorStore((s) => s.setSpaceDraft)
  return (
    <div className="toolbar toolbar-secondary" role="group" aria-label="Nov element">
      {kind === 'obstacle' ? (
        <label>
          Kategorija ovire{' '}
          <select
            value={draft.category}
            onChange={(e) => setDraft({ category: e.target.value as ObstacleCategory })}
          >
            {OBSTACLE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <label>
          Vrsta cone{' '}
          <select
            value={draft.zoneKind}
            onChange={(e) => setDraft({ zoneKind: e.target.value as ZoneKind })}
          >
            {ZONE_KINDS.map((k) => (
              <option key={k} value={k}>
                {ZONE_KIND_LABELS[k]}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  )
}
