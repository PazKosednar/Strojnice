import { Link } from 'react-router'
import { useAuthStore } from '../stores/authStore'

export function AppHeader() {
  const email = useAuthStore((s) => s.session?.user.email)
  const signOut = useAuthStore((s) => s.signOut)

  return (
    <header className="app-header">
      <Link to="/projekti" className="app-title">
        Strojnice
      </Link>
      <span className="spacer" />
      {email && <span className="muted">{email}</span>}
      <button type="button" onClick={() => void signOut()}>
        Odjava
      </button>
    </header>
  )
}
