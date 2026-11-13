import { endDiameter, endLabel, resolveEnd } from '../core/pipeEnds'
import { removePipe } from '../core/pipeOps'
import { editPipeRoute, removeVertex, requestAutoRoute, setSegmentHeight } from '../core/routeEdit'
import { routeStats, wallCrossings } from '../core/routing/routeGeometry'
import type { Pipe, Scene } from '../core/scene'
import { useEditorStore } from '../stores/editorStore'
import { NumberField } from './NumberField'

interface Props {
  pipe: Pipe
  scene: Scene
}

/** Properties of a pipe: system, ends, diameter, length, bends, mode and route edits. */
export function PipeProperties({ pipe, scene }: Props) {
  const apply = useEditorStore((s) => s.apply)
  const pipeEdit = useEditorStore((s) => s.pipeEdit)
  const setPipeEdit = useEditorStore((s) => s.setPipeEdit)
  const system = scene.settings.systems.find((s) => s.id === pipe.systemId)
  const stats = routeStats(pipe.route)
  const crossings = wallCrossings(scene, pipe.route)

  const end = (which: 'from' | 'to') => {
    const resolved = resolveEnd(scene, pipe[which])
    if (!resolved) return 'ne obstaja več'
    const d = endDiameter(resolved)
    return `${endLabel(resolved)} (⌀ ${d ?? '—'} mm)`
  }

  const segment = pipeEdit.segment
  const a = segment !== null ? pipe.route[segment] : undefined
  const b = segment !== null ? pipe.route[segment + 1] : undefined
  const horizontal = a && b && a.z === b.z

  return (
    <>
      <h2>Cev</h2>
      <dl className="info">
        <dt>Sistem</dt>
        <dd>
          <span className="swatch inline" style={{ background: system?.color }} />{' '}
          {system?.name ?? 'neznan sistem'}
        </dd>
        <dt>Od</dt>
        <dd>{end('from')}</dd>
        <dt>Do</dt>
        <dd>{end('to')}</dd>
        <dt>Zunanji premer</dt>
        <dd>{pipe.outerDiameter} mm</dd>
        <dt>Dolžina</dt>
        <dd>{pipe.route.length > 1 ? `${Math.round(stats.length)} mm` : '—'}</dd>
        <dt>Število kolen</dt>
        <dd>{pipe.route.length > 1 ? stats.bends : '—'}</dd>
        <dt>Preboji sten</dt>
        <dd>{crossings.length}</dd>
        <dt>Način</dt>
        <dd>{pipe.mode === 'auto' ? 'samodejno' : 'ročno (se ne spelje samodejno)'}</dd>
      </dl>
      {pipe.routeError && (
        <p className="error small" role="alert">
          {pipe.routeError}
        </p>
      )}
      <p className="row">
        <button type="button" onClick={() => apply((s) => requestAutoRoute(s, pipe.id))}>
          Speljaj samodejno
        </button>
        <button type="button" onClick={() => apply((s) => removePipe(s, pipe.id))}>
          Izbriši cev
        </button>
      </p>

      <h3>Ročni popravki</h3>
      <p className="muted small">
        Vleci vodoravni odsek v tlorisu. Dvoklik na cev doda lom. Izberi oglišče (kvadratek) in
        pritisni Delete. Prvi ročni poseg preklopi cev v ročni način.
      </p>
      {horizontal && segment !== null && (
        <NumberField
          label={`Višina odseka ${segment + 1}`}
          value={a.z}
          onCommit={(z) =>
            apply((s) => editPipeRoute(s, pipe.id, (route) => setSegmentHeight(route, segment, z)))
          }
        />
      )}
      {pipeEdit.vertex !== null && (
        <p className="row">
          <span className="small">Izbrano oglišče {pipeEdit.vertex}</span>
          <button
            type="button"
            onClick={() => {
              const vertex = pipeEdit.vertex!
              if (apply((s) => editPipeRoute(s, pipe.id, (route) => removeVertex(route, vertex)))) {
                setPipeEdit({ segment: null, vertex: null })
              }
            }}
          >
            Odstrani oglišče
          </button>
        </p>
      )}
    </>
  )
}
