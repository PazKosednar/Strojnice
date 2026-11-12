const dateTimeFormat = new Intl.DateTimeFormat('sl-SI', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

/** Formats an ISO timestamp for display in Slovenian locale. */
export function formatDateTime(iso: string): string {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? iso : dateTimeFormat.format(date)
}
