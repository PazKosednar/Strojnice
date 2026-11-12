import type { Session } from '@supabase/supabase-js'
import { create } from 'zustand'
import { authErrorMessage } from '../lib/authErrors'
import { getSupabase } from '../lib/supabase'
import { useProjectsStore } from './projectsStore'

export type AuthStatus = 'loading' | 'signedIn' | 'signedOut'

/** Result of an auth action: a Slovenian error message, or success. */
export type AuthResult = { ok: true } | { ok: false; error: string }

export type SignUpResult = { ok: true; needsConfirmation: boolean } | { ok: false; error: string }

interface AuthState {
  status: AuthStatus
  session: Session | null
  /** Subscribes to Supabase auth changes. Returns an unsubscribe function. */
  init: () => () => void
  signIn: (email: string, password: string) => Promise<AuthResult>
  signUp: (email: string, password: string) => Promise<SignUpResult>
  signOut: () => Promise<void>
}

function sessionState(session: Session | null) {
  return { session, status: session ? 'signedIn' : 'signedOut' } as const
}

export const useAuthStore = create<AuthState>()((set, get) => {
  /** Stores the session; drops other users' cached data when the signed-in user changes. */
  const applySession = (session: Session | null) => {
    if (get().session?.user.id !== session?.user.id) useProjectsStore.getState().reset()
    set(sessionState(session))
  }

  return {
    status: 'loading',
    session: null,

    init: () => {
      const supabase = getSupabase()
      void supabase.auth.getSession().then(({ data }) => applySession(data.session))
      // Keep this callback synchronous: awaiting Supabase calls inside it can deadlock.
      const { data } = supabase.auth.onAuthStateChange((_event, session) => applySession(session))
      return () => data.subscription.unsubscribe()
    },

    signIn: async (email, password) => {
      const { error } = await getSupabase().auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      return error ? { ok: false, error: authErrorMessage(error) } : { ok: true }
    },

    signUp: async (email, password) => {
      const { data, error } = await getSupabase().auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: `${window.location.origin}/prijava` },
      })
      if (error) return { ok: false, error: authErrorMessage(error) }
      // With email confirmation enabled Supabase returns no session until the link is clicked.
      return { ok: true, needsConfirmation: data.session === null }
    },

    signOut: async () => {
      await getSupabase().auth.signOut()
      applySession(null)
    },
  }
})
