import { duplicateEquipment } from '../core/equipmentOps'
import { useEditorStore } from '../stores/editorStore'
import { newId } from './newId'

/** Duplicates equipment and selects the copy (button and Ctrl+D). */
export function duplicateSelected(id: string) {
  const { apply, select } = useEditorStore.getState()
  const copyId = newId()
  if (apply((s) => duplicateEquipment(s, id, copyId))) select({ kind: 'equipment', id: copyId })
}
