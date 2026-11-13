import type { EquipmentType } from '../core/scene'
import { useEditorStore } from '../stores/editorStore'
import { describeType } from './describeType'
import { groupByManufacturer, PUBLIC_PRODUCTS } from './public'

const GROUPS = groupByManufacturer(PUBLIC_PRODUCTS)

interface Props {
  /** Opens the type form with a copy for the user's own catalogue. */
  onCopy: (type: EquipmentType) => void
}

/** Products of the public catalogue (defined in code, read-only), grouped by manufacturer. */
export function PublicCatalogList({ onCopy }: Props) {
  const placingType = useEditorStore((s) => s.placingType)
  const tool = useEditorStore((s) => s.tool)
  const startPlacing = useEditorStore((s) => s.startPlacing)

  return (
    <section aria-label="Javni katalog">
      <h3>Javni katalog</h3>
      <p className="muted small">
        Izdelki proizvajalcev, na voljo vsem. Za spremembe (npr. priključki) jih kopiraj v svoj
        katalog.
      </p>
      {GROUPS.map((group) => (
        <div key={group.manufacturer}>
          <h4>{group.manufacturer}</h4>
          <ul className="catalog-list">
            {group.products.map(({ type }) => {
              const active = tool === 'equipment' && placingType?.id === type.id
              return (
                <li key={type.id} className={active ? 'active' : undefined}>
                  <strong>{type.name}</strong>
                  <span className="muted small">{describeType(type)}</span>
                  <span className="row">
                    <button type="button" aria-pressed={active} onClick={() => startPlacing(type)}>
                      Postavi
                    </button>
                    <button type="button" onClick={() => onCopy(type)}>
                      Kopiraj v moj katalog
                    </button>
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </section>
  )
}
