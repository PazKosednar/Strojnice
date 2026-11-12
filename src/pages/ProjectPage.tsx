import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { parseScene } from '../core/parseScene'
import { Editor } from '../editor/Editor'
import { actionErrorMessage } from '../lib/errors'
import { getProject } from '../lib/projectsApi'
import { useEditorStore } from '../stores/editorStore'

type LoadState =
  | { kind: 'loading' }
  | { kind: 'notFound' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; name: string }

/** Loads the project, validates its scene and opens the editor. */
export function ProjectPage() {
  const { id = '' } = useParams()
  // Remembers which project the state belongs to, so switching ids shows "loading" again.
  const [loaded, setLoaded] = useState<{ id: string; state: LoadState } | null>(null)
  const state: LoadState = loaded?.id === id ? loaded.state : { kind: 'loading' }

  useEffect(() => {
    let cancelled = false
    const setState = (next: LoadState) => setLoaded({ id, state: next })
    getProject(id)
      .then((project) => {
        if (cancelled) return
        if (!project) return setState({ kind: 'notFound' })
        const parsed = parseScene(project.scene)
        if (!parsed.ok) {
          return setState({
            kind: 'error',
            message: `Scene projekta ni mogoče prebrati (${parsed.error}). Podatki v bazi niso bili spremenjeni.`,
          })
        }
        useEditorStore.getState().load(project.id, parsed.scene)
        setState({ kind: 'ready', name: project.name })
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setState({
            kind: 'error',
            message: actionErrorMessage('Projekta ni bilo mogoče naložiti', err),
          })
        }
      })
    return () => {
      cancelled = true
    }
  }, [id])

  if (state.kind === 'ready') return <Editor key={id} projectId={id} projectName={state.name} />

  return (
    <div className="page">
      <p>
        <Link to="/projekti">← Vsi projekti</Link>
      </p>
      {state.kind === 'loading' && <p>Nalaganje …</p>}
      {state.kind === 'notFound' && <p>Projekt ne obstaja ali do njega nimaš dostopa.</p>}
      {state.kind === 'error' && (
        <p className="error" role="alert">
          {state.message}
        </p>
      )}
    </div>
  )
}
