import type { ProposalReason } from '../core/connect/proposeConnections'
import { endLabel, pipeEndKey, resolveEnd } from '../core/pipeEnds'
import { pipeTotals, type PipeTotals } from '../core/pipeTotals'
import { routeStats, wallCrossings } from '../core/routing/routeGeometry'
import type { PipeEnd, Scene } from '../core/scene'
import { acceptPreview, applyJointResult, withProposedPipes } from '../routing/autoConnect'
import {
  createJointRoutingClient,
  type JointRoutingClient,
  type JointWorkerLike,
} from '../routing/jointRoutingClient'
import { chosenPairs, useAutoConnectStore } from '../stores/autoConnectStore'
import { selectScene, useEditorStore } from '../stores/editorStore'
import { newId } from './newId'
import { sceneErrorMessage } from './sceneErrorMessages'

const REASONS: Record<ProposalReason, string> = {
  key: 'ključ',
  onlyCandidate: 'edini kandidat',
  ambiguous: 'nejasno – izberi',
}

let client: JointRoutingClient | null = null
function jointClient(): JointRoutingClient {
  client ??= createJointRoutingClient({
    createWorker: () =>
      new Worker(new URL('../routing/routeAll.worker.ts', import.meta.url), {
        type: 'module',
      }) as unknown as JointWorkerLike,
  })
  return client
}

const label = (scene: Scene, end: PipeEnd) => {
  const resolved = resolveEnd(scene, end)
  return resolved ? endLabel(resolved) : '?'
}

const metres = (mm: number) => `${(mm / 1000).toFixed(2).replace('.', ',')} m`

function TotalsTable({ before, after }: { before: PipeTotals; after: PipeTotals }) {
  const rows: [string, (t: PipeTotals) => string][] = [
    ['Cevi', (t) => String(t.pipes)],
    ['Brez trase', (t) => String(t.unrouted)],
    ['Skupna dolžina', (t) => metres(t.length)],
    ['Kolena', (t) => String(t.bends)],
    ['Preboji sten', (t) => String(t.wallCrossings)],
    ['Kršitve pravil', (t) => String(t.violations)],
  ]
  return (
    <table className="totals" aria-label="Primerjava pred in po">
      <thead>
        <tr>
          <th />
          <th>Pred</th>
          <th>Po</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([name, value]) => (
          <tr key={name}>
            <th scope="row">{name}</th>
            <td>{value(before)}</td>
            <td>{value(after)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/**
 * "Samodejno poveži in spelji": proposes which free ports belong together, routes the
 * confirmed pairs together in a worker and shows the result for accepting. Nothing changes
 * in the project until the user accepts; accepting is one undo step.
 */
export function AutoConnectPanel() {
  const scene = useEditorStore(selectScene)
  const apply = useEditorStore((s) => s.apply)
  const state = useAutoConnectStore()
  const { stage, base, proposals, choices, preview, previewIds, selected, progress } = state
  if (stage === 'closed' || !base) return null

  const close = () => {
    client?.cancel()
    state.close()
  }

  const route = async () => {
    const chosen = chosenPairs(proposals, choices)
    if ('error' in chosen) return state.setMessage(chosen.error)
    if (chosen.pairs.length === 0) return state.setMessage('Izberi vsaj en par.')
    const added = withProposedPipes(base, chosen.pairs, newId)
    if ('error' in added) return state.setMessage(sceneErrorMessage(added.error.error))
    state.startRouting(added.ids.length)
    const outcome = await jointClient().run(added.scene, added.ids, state.setProgress)
    if (useAutoConnectStore.getState().stage !== 'routing') return
    if (outcome.type === 'cancelled') {
      state.backToProposals()
      state.setMessage('Speljevanje je prekinjeno.')
      return
    }
    state.showPreview(applyJointResult(added.scene, outcome.results, outcome.routes), added.ids)
  }

  const accept = (ids: readonly string[]) => {
    if (!preview) return
    if (scene !== base) {
      state.setMessage('Projekt se je medtem spremenil. Zaženi samodejno povezovanje znova.')
      return
    }
    if (apply(acceptPreview(preview, ids))) state.close()
  }

  return (
    <aside className="auto-connect" aria-label="Samodejno povezovanje">
      <div className="auto-connect-head">
        <h2>Samodejno poveži in spelji</h2>
        <button type="button" aria-label="Zapri samodejno povezovanje" onClick={close}>
          ×
        </button>
      </div>
      {state.message && (
        <p className="error small" role="alert">
          {state.message}
        </p>
      )}

      {stage === 'proposals' && (
        <>
          {proposals.length === 0 ? (
            <p className="muted">Ni prostih priključkov, ki bi jih bilo mogoče povezati.</p>
          ) : (
            <>
              <p className="muted small">
                Predlog parov prostih priključkov. Ključ: isti ključ povezave, tok ven → noter.
                Edini kandidat: edini prosti priključek istega sistema in premera. Pri nejasnih
                izberi par. Nič se ne poveže brez potrditve.
              </p>
              <table className="proposals">
                <thead>
                  <tr>
                    <th />
                    <th>Od</th>
                    <th>Do</th>
                    <th>Razlog</th>
                  </tr>
                </thead>
                <tbody>
                  {proposals.map((p) => {
                    const choice = choices[p.id]!
                    const from = label(base, p.from)
                    return (
                      <tr key={p.id} data-testid={`proposal-${p.id}`}>
                        <td>
                          <input
                            type="checkbox"
                            aria-label={`Poveži ${from}`}
                            checked={choice.enabled}
                            disabled={choice.partner === null}
                            onChange={(e) => state.setEnabled(p.id, e.target.checked)}
                          />
                        </td>
                        <td>{from}</td>
                        <td>
                          {p.reason === 'ambiguous' ? (
                            <select
                              aria-label={`Par za ${from}`}
                              value={choice.partner ?? ''}
                              onChange={(e) => state.setPartner(p.id, e.target.value || null)}
                            >
                              <option value="">— ne poveži —</option>
                              {p.candidates.map((c) => (
                                <option key={pipeEndKey(c)} value={pipeEndKey(c)}>
                                  {label(base, c)}
                                </option>
                              ))}
                            </select>
                          ) : (
                            label(base, p.to!)
                          )}
                        </td>
                        <td className="small">{REASONS[p.reason]}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <p className="row">
                <button type="button" onClick={() => void route()}>
                  Spelji izbrane
                </button>
              </p>
            </>
          )}
        </>
      )}

      {stage === 'routing' && (
        <>
          <p role="status">
            Speljujem cevi {progress.done}/{progress.total} …
          </p>
          <button type="button" onClick={() => jointClient().cancel()}>
            Prekliči
          </button>
        </>
      )}

      {stage === 'preview' && preview && (
        <>
          <p className="muted small">
            Predlog je v tlorisu in 3D prikazan prosojno. Projekt se spremeni šele s sprejemom (en
            korak razveljavitve).
          </p>
          <TotalsTable before={pipeTotals(base)} after={pipeTotals(preview)} />
          <ul className="preview-list">
            {previewIds.map((id) => {
              const pipe = preview.pipes.find((p) => p.id === id)!
              const name = `${label(preview, pipe.from)} → ${label(preview, pipe.to)}`
              const routed = pipe.route.length > 1
              const stats = routeStats(pipe.route)
              return (
                <li key={id} data-testid={`preview-${id}`}>
                  <label className="toggle">
                    <input
                      type="checkbox"
                      aria-label={`Sprejmi ${name}`}
                      checked={selected.includes(id)}
                      onChange={() => state.toggleSelected(id)}
                    />
                    {name}
                  </label>
                  <span className="small muted">
                    {routed
                      ? `${metres(stats.length)}, kolen ${stats.bends}, prebojev ${wallCrossings(preview, pipe.route).length}`
                      : `Ni speljana: ${pipe.routeError ?? ''}`}
                  </span>
                </li>
              )
            })}
          </ul>
          <p className="row">
            <button type="button" onClick={() => accept(previewIds)}>
              Sprejmi vse
            </button>
            <button type="button" onClick={() => accept(selected)} disabled={selected.length === 0}>
              Sprejmi izbrane
            </button>
            <button type="button" onClick={close}>
              Zavrzi
            </button>
          </p>
        </>
      )}
    </aside>
  )
}
