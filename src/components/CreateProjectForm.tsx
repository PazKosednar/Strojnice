import { useState, type SubmitEvent } from 'react'
import { validateProjectName } from '../lib/validation'

interface Props {
  onCreate: (name: string) => Promise<boolean>
}

export function CreateProjectForm({ onCreate }: Props) {
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()
    const validation = validateProjectName(name)
    setError(validation)
    if (validation) return
    setBusy(true)
    const ok = await onCreate(name)
    setBusy(false)
    if (ok) setName('')
  }

  return (
    <form onSubmit={(e) => void submit(e)}>
      <div className="row">
        <input
          aria-label="Ime novega projekta"
          placeholder="Ime novega projekta"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={busy}
        />
        <button type="submit" disabled={busy}>
          Ustvari projekt
        </button>
      </div>
      {error && <p className="error">{error}</p>}
    </form>
  )
}
