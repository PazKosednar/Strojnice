import { useEffect, useState } from 'react'
import type { EquipmentType } from '../core/scene'
import { newId } from '../editor/newId'
import { useCatalogStore } from '../stores/catalogStore'
import { selectScene, useEditorStore } from '../stores/editorStore'
import { describeType } from './describeType'
import { EquipmentTypeForm } from './EquipmentTypeForm'
import { PublicCatalogList } from './PublicCatalogList'
import { EQUIPMENT_TEMPLATES } from './templates'
import { draftFromTemplate, draftFromType, type TypeDraft } from './typeDraft'

type Mode =
  { kind: 'list' } | { kind: 'templates' } | { kind: 'form'; title: string; draft: TypeDraft }

/** The user's equipment catalogue: list, create from a template, edit, duplicate, delete, place. */
export function CatalogPanel() {
  const status = useCatalogStore((s) => s.status)
  const types = useCatalogStore((s) => s.types)
  const invalid = useCatalogStore((s) => s.invalid)
  const error = useCatalogStore((s) => s.error)
  const load = useCatalogStore((s) => s.load)
  const save = useCatalogStore((s) => s.save)
  const remove = useCatalogStore((s) => s.remove)
  const systems = useEditorStore((s) => selectScene(s).settings.systems)
  const placingType = useEditorStore((s) => s.placingType)
  const tool = useEditorStore((s) => s.tool)
  const startPlacing = useEditorStore((s) => s.startPlacing)
  const [mode, setMode] = useState<Mode>({ kind: 'list' })

  useEffect(() => {
    if (status === 'idle') void load()
  }, [status, load])

  const confirmRemove = (id: string, name: string) => {
    if (window.confirm(`Izbrišem tip »${name}« iz kataloga? Že postavljene naprave ostanejo.`)) {
      void remove(id)
    }
  }

  const duplicate = (type: EquipmentType) => {
    const copy = draftFromType(type)
    setMode({
      kind: 'form',
      title: 'Nov tip (kopija)',
      draft: {
        ...copy,
        id: newId(),
        name: `${type.name} (kopija)`,
        ports: copy.ports.map((p) => ({ ...p, id: newId() })),
      },
    })
  }

  return (
    <div className="catalog">
      <h2>Katalog naprav</h2>
      <PublicCatalogList onCopy={duplicate} />

      <h3>Moj katalog</h3>
      <p className="muted small">
        Tvoji tipi naprav, na voljo v vseh projektih. Sprememba tipa ne spremeni že postavljenih
        naprav.
      </p>
      <button type="button" onClick={() => setMode({ kind: 'templates' })}>
        Nov tip
      </button>

      {mode.kind === 'templates' && (
        <div className="template-list" role="group" aria-label="Predloga">
          <p className="small">Izberi predlogo (določi le obliko, predpono in montažo):</p>
          {EQUIPMENT_TEMPLATES.map((template) => (
            <button
              key={template.key}
              type="button"
              onClick={() =>
                setMode({
                  kind: 'form',
                  title: `Nov tip: ${template.label}`,
                  draft: draftFromTemplate(template, newId()),
                })
              }
            >
              {template.label}
            </button>
          ))}
          <button type="button" onClick={() => setMode({ kind: 'list' })}>
            Prekliči
          </button>
        </div>
      )}

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {status === 'failed' && (
        <button type="button" onClick={() => void load()}>
          Poskusi znova
        </button>
      )}
      {status === 'loading' && <p>Nalaganje …</p>}
      {status === 'ready' && types.length === 0 && (
        <p className="muted">
          Tvoj katalog je prazen. Ustvari tip z gumbom »Nov tip« ali kopiraj izdelek iz javnega
          kataloga.
        </p>
      )}

      <ul className="catalog-list">
        {types.map((type) => {
          const active = tool === 'equipment' && placingType?.id === type.id
          return (
            <li key={type.id} className={active ? 'active' : undefined}>
              <strong>{type.name}</strong>
              <span className="muted small">{describeType(type)}</span>
              <span className="row">
                <button type="button" aria-pressed={active} onClick={() => startPlacing(type)}>
                  Postavi
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setMode({
                      kind: 'form',
                      title: `Uredi tip: ${type.name}`,
                      draft: draftFromType(type),
                    })
                  }
                >
                  Uredi
                </button>
                <button type="button" onClick={() => duplicate(type)}>
                  Podvoji
                </button>
                <button type="button" onClick={() => confirmRemove(type.id, type.name)}>
                  Izbriši
                </button>
              </span>
            </li>
          )
        })}
        {invalid.map((entry) => (
          <li key={entry.id}>
            <strong>{entry.name}</strong>
            <span className="error small">Zapisa ni mogoče prebrati ({entry.error}).</span>
            <span className="row">
              <button type="button" onClick={() => confirmRemove(entry.id, entry.name)}>
                Izbriši
              </button>
            </span>
          </li>
        ))}
      </ul>

      {mode.kind === 'form' && (
        <EquipmentTypeForm
          key={mode.draft.id}
          title={mode.title}
          initial={mode.draft}
          systems={systems}
          onCancel={() => setMode({ kind: 'list' })}
          onSave={async (type) => {
            const saved = await save(type)
            if (saved) setMode({ kind: 'list' })
            return saved
          }}
        />
      )}
    </div>
  )
}
