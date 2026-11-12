import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '../stores/authStore'
import { LoginPage } from './LoginPage'

function renderPage() {
  render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  )
}

describe('LoginPage', () => {
  afterEach(() => {
    useAuthStore.setState({ status: 'loading', session: null })
    vi.restoreAllMocks()
  })

  it('shows a validation error and does not call Supabase for invalid input', async () => {
    const signIn = vi.fn()
    useAuthStore.setState({ status: 'signedOut', signIn })
    renderPage()

    await userEvent.click(screen.getByRole('button', { name: 'Prijava' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Vnesi e-poštni naslov.')
    expect(signIn).not.toHaveBeenCalled()
  })

  it('shows the Slovenian error returned by sign-in', async () => {
    const signIn = vi
      .fn()
      .mockResolvedValue({ ok: false, error: 'Napačen e-poštni naslov ali geslo.' })
    useAuthStore.setState({ status: 'signedOut', signIn })
    renderPage()

    await userEvent.type(screen.getByLabelText('E-pošta'), 'ana@primer.si')
    await userEvent.type(screen.getByLabelText('Geslo'), 'geslo123')
    await userEvent.click(screen.getByRole('button', { name: 'Prijava' }))

    expect(signIn).toHaveBeenCalledWith('ana@primer.si', 'geslo123')
    expect(await screen.findByRole('alert')).toHaveTextContent('Napačen e-poštni naslov ali geslo.')
  })

  it('tells the user to confirm the email after sign-up when required', async () => {
    const signUp = vi.fn().mockResolvedValue({ ok: true, needsConfirmation: true })
    useAuthStore.setState({ status: 'signedOut', signUp })
    renderPage()

    await userEvent.click(screen.getByRole('button', { name: 'Registracija' }))
    expect(screen.getByRole('heading', { name: 'Registracija' })).toBeInTheDocument()

    await userEvent.type(screen.getByLabelText('E-pošta'), 'ana@primer.si')
    await userEvent.type(screen.getByLabelText('Geslo'), 'geslo123')
    // The submit button is the first "Registracija" button; the second switches modes.
    const [submit] = screen.getAllByRole('button', { name: 'Registracija' })
    await userEvent.click(submit!)

    expect(signUp).toHaveBeenCalledWith('ana@primer.si', 'geslo123')
    expect(await screen.findByRole('status')).toHaveTextContent('povezavo za potrditev')
  })
})
