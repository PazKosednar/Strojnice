import { useState, type SubmitEvent } from 'react'
import { Navigate, useLocation } from 'react-router'
import { validateCredentials } from '../lib/validation'
import { useAuthStore } from '../stores/authStore'

type Mode = 'signIn' | 'signUp'

function redirectTarget(state: unknown): string {
  if (state && typeof state === 'object' && 'from' in state && typeof state.from === 'string') {
    return state.from
  }
  return '/projekti'
}

export function LoginPage() {
  const status = useAuthStore((s) => s.status)
  const signIn = useAuthStore((s) => s.signIn)
  const signUp = useAuthStore((s) => s.signUp)
  const location = useLocation()

  const [mode, setMode] = useState<Mode>('signIn')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (status === 'signedIn') return <Navigate to={redirectTarget(location.state)} replace />

  const switchMode = (next: Mode) => {
    setMode(next)
    setError(null)
    setInfo(null)
  }

  const submit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()
    setInfo(null)
    const validation = validateCredentials(email, password)
    setError(validation)
    if (validation) return

    setBusy(true)
    if (mode === 'signIn') {
      const result = await signIn(email, password)
      if (!result.ok) setError(result.error)
    } else {
      const result = await signUp(email, password)
      if (!result.ok) {
        setError(result.error)
      } else if (result.needsConfirmation) {
        setInfo(
          'Registracija je uspela. Na e-pošto smo poslali povezavo za potrditev. ' +
            'Po potrditvi se prijavi.',
        )
        setMode('signIn')
        setPassword('')
      }
    }
    setBusy(false)
  }

  const isSignIn = mode === 'signIn'

  return (
    <main className="page narrow">
      <h1>{isSignIn ? 'Prijava' : 'Registracija'}</h1>
      <form onSubmit={(e) => void submit(e)} className="stack" noValidate>
        <label>
          E-pošta
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={busy}
          />
        </label>
        <label>
          Geslo
          <input
            type="password"
            autoComplete={isSignIn ? 'current-password' : 'new-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={busy}
          />
        </label>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {info && (
          <p className="info" role="status">
            {info}
          </p>
        )}
        <button type="submit" disabled={busy}>
          {isSignIn ? 'Prijava' : 'Registracija'}
        </button>
      </form>
      <p>
        {isSignIn ? 'Še nimaš računa? ' : 'Že imaš račun? '}
        <button
          type="button"
          className="link"
          onClick={() => switchMode(isSignIn ? 'signUp' : 'signIn')}
        >
          {isSignIn ? 'Registracija' : 'Prijava'}
        </button>
      </p>
    </main>
  )
}
