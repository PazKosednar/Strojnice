/** Supabase's default minimum password length. */
export const MIN_PASSWORD_LENGTH = 6

/** Matches the database check constraint on projects.name. */
export const MAX_PROJECT_NAME_LENGTH = 200

/** Returns a Slovenian error message, or null when the input is valid. */
export function validateCredentials(email: string, password: string): string | null {
  const trimmed = email.trim()
  if (trimmed === '') return 'Vnesi e-poštni naslov.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return 'E-poštni naslov ni veljaven.'
  if (password === '') return 'Vnesi geslo.'
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Geslo mora imeti vsaj ${MIN_PASSWORD_LENGTH} znakov.`
  }
  return null
}

/** Returns a Slovenian error message, or null when the name is valid. */
export function validateProjectName(name: string): string | null {
  const trimmed = name.trim()
  if (trimmed === '') return 'Vnesi ime projekta.'
  if (trimmed.length > MAX_PROJECT_NAME_LENGTH) {
    return `Ime projekta je predolgo (največ ${MAX_PROJECT_NAME_LENGTH} znakov).`
  }
  return null
}
