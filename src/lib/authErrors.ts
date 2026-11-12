interface AuthLikeError {
  code?: string
  message: string
}

// Supabase Auth error codes: https://supabase.com/docs/guides/auth/debugging/error-codes
const MESSAGES: Record<string, string> = {
  invalid_credentials: 'Napačen e-poštni naslov ali geslo.',
  email_not_confirmed:
    'E-poštni naslov še ni potrjen. Preveri pošto in klikni povezavo za potrditev.',
  user_already_exists: 'Uporabnik s tem e-poštnim naslovom že obstaja.',
  email_exists: 'Uporabnik s tem e-poštnim naslovom že obstaja.',
  weak_password: 'Geslo je prešibko.',
  over_request_rate_limit: 'Preveč poskusov. Počakaj nekaj minut in poskusi znova.',
  over_email_send_rate_limit: 'Poslanih je bilo preveč e-poštnih sporočil. Poskusi kasneje.',
  signup_disabled: 'Registracija je trenutno onemogočena.',
  email_address_invalid: 'E-poštni naslov ni veljaven.',
}

/** Maps a Supabase Auth error to a Slovenian user-facing message. */
export function authErrorMessage(error: AuthLikeError): string {
  return (error.code && MESSAGES[error.code]) || `Prišlo je do napake: ${error.message}`
}
