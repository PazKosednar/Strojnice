import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { AppLayout } from './components/AppLayout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { LoginPage } from './pages/LoginPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { ProjectPage } from './pages/ProjectPage'
import { ProjectsPage } from './pages/ProjectsPage'
import { useAuthStore } from './stores/authStore'

export function App() {
  const init = useAuthStore((s) => s.init)

  useEffect(() => init(), [init])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/projekti" replace />} />
        <Route path="/prijava" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/projekti" element={<ProjectsPage />} />
            <Route path="/projekti/:id" element={<ProjectPage />} />
          </Route>
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}
