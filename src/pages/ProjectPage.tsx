import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { actionErrorMessage } from '../lib/errors'
import { getProject, type ProjectRow } from '../lib/projectsApi'

type LoadState =
  | { kind: 'loading' }
  | { kind: 'notFound' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; project: ProjectRow }

/** Project page. In phase 0 it shows only the project name; the editor comes in phase 1. */
export function ProjectPage() {
  const { id = '' } = useParams()
  const [state, setState] = useState<LoadState>({ kind: 'loading' })

  useEffect(() => {
    let cancelled = false
    getProject(id)
      .then((project) => {
        if (!cancelled) setState(project ? { kind: 'ready', project } : { kind: 'notFound' })
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

  return (
    <>
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
      {state.kind === 'ready' && (
        <>
          <h1>{state.project.name}</h1>
          <p className="muted">Urejevalnik pride v fazi 1.</p>
        </>
      )}
    </>
  )
}
