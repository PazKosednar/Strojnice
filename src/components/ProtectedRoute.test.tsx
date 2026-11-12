import type { Session } from '@supabase/supabase-js'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import { useAuthStore } from '../stores/authStore'
import { ProtectedRoute } from './ProtectedRoute'

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/prijava" element={<p>stran za prijavo</p>} />
        <Route element={<ProtectedRoute />}>
          <Route path="/projekti" element={<p>zaščitena vsebina</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('ProtectedRoute', () => {
  afterEach(() => useAuthStore.setState({ status: 'loading', session: null }))

  it('shows a loading message while the session is being restored', () => {
    useAuthStore.setState({ status: 'loading' })
    renderAt('/projekti')
    expect(screen.getByText('Nalaganje …')).toBeInTheDocument()
  })

  it('redirects signed-out users to /prijava', () => {
    useAuthStore.setState({ status: 'signedOut' })
    renderAt('/projekti')
    expect(screen.getByText('stran za prijavo')).toBeInTheDocument()
  })

  it('renders the protected page for signed-in users', () => {
    useAuthStore.setState({ status: 'signedIn', session: {} as Session })
    renderAt('/projekti')
    expect(screen.getByText('zaščitena vsebina')).toBeInTheDocument()
  })
})
