import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuthStore } from '../stores/authStore'

/** Renders child routes only for signed-in users; otherwise redirects to /prijava. */
export function ProtectedRoute() {
  const status = useAuthStore((s) => s.status)
  const location = useLocation()

  if (status === 'loading') return <p className="page">Nalaganje …</p>
  if (status === 'signedOut') {
    return <Navigate to="/prijava" replace state={{ from: location.pathname }} />
  }
  return <Outlet />
}
