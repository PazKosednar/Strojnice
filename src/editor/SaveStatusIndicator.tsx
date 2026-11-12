import type { SaveStatus } from '../lib/autosave'
import { useEditorStore } from '../stores/editorStore'

const LABELS: Record<SaveStatus, string> = {
  saved: 'Shranjeno',
  pending: 'Shranjujem …',
  saving: 'Shranjujem …',
  error: 'Napaka pri shranjevanju – poskušam znova',
}

export function SaveStatusIndicator() {
  const status = useEditorStore((s) => s.saveStatus)
  return (
    <span className={`save-status save-${status}`} role="status">
      {LABELS[status]}
    </span>
  )
}
