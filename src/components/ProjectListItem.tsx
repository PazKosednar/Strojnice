import { useState, type SubmitEvent } from 'react'
import { Link } from 'react-router'
import type { ProjectSummary } from '../lib/projectsApi'
import { validateProjectName } from '../lib/validation'
import { formatDateTime } from '../lib/format'

interface Props {
  project: ProjectSummary
  onRename: (id: string, name: string) => Promise<boolean>
  onDelete: (id: string) => Promise<boolean>
}

export function ProjectListItem({ project, onRename, onDelete }: Props) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(project.name)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const startEditing = () => {
    setName(project.name)
    setError(null)
    setEditing(true)
  }

  const submit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()
    const validation = validateProjectName(name)
    if (validation) return setError(validation)
    setBusy(true)
    const ok = await onRename(project.id, name)
    setBusy(false)
    if (ok) setEditing(false)
  }

  const remove = async () => {
    if (!window.confirm(`Izbrišem projekt »${project.name}«? Tega ni mogoče razveljaviti.`)) return
    setBusy(true)
    const ok = await onDelete(project.id)
    if (!ok) setBusy(false)
  }

  if (editing) {
    return (
      <li className="project-item">
        <form onSubmit={(e) => void submit(e)} className="row">
          <input
            aria-label="Novo ime projekta"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            disabled={busy}
          />
          <button type="submit" disabled={busy}>
            Shrani
          </button>
          <button type="button" onClick={() => setEditing(false)} disabled={busy}>
            Prekliči
          </button>
        </form>
        {error && <p className="error">{error}</p>}
      </li>
    )
  }

  return (
    <li className="project-item row">
      <Link to={`/projekti/${project.id}`} className="project-name">
        {project.name}
      </Link>
      <span className="muted">spremenjeno {formatDateTime(project.updated_at)}</span>
      <span className="spacer" />
      <button type="button" onClick={startEditing} disabled={busy}>
        Preimenuj
      </button>
      <button type="button" onClick={() => void remove()} disabled={busy}>
        Izbriši
      </button>
    </li>
  )
}
