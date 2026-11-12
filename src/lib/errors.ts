/** Builds a user-facing message from an action description and an unknown error. */
export function actionErrorMessage(action: string, err: unknown): string {
  const detail =
    err !== null && typeof err === 'object' && 'message' in err && typeof err.message === 'string'
      ? err.message
      : ''
  return detail ? `${action}: ${detail}` : action
}
