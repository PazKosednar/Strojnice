import { useEffect } from 'react'
import type { Scene } from '../core/scene'
import { createAutosave } from '../lib/autosave'
import { saveScene } from '../lib/projectsApi'
import { useEditorStore } from '../stores/editorStore'

/**
 * Saves the editor scene to Supabase after each change (debounced, with retry).
 * Unsaved changes stay in memory and the browser warns before closing the tab.
 */
export function useSceneAutosave(projectId: string) {
  useEffect(() => {
    const autosave = createAutosave<Scene>({
      save: (scene) => saveScene(projectId, scene),
      onStatus: (status) => useEditorStore.getState().setSaveStatus(status),
    })
    let previous = useEditorStore.getState().history.present
    const unsubscribe = useEditorStore.subscribe((state) => {
      const scene = state.history.present
      if (scene === previous) return
      previous = scene
      autosave.change(scene)
    })
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!autosave.hasUnsavedChanges()) return
      e.preventDefault()
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => {
      unsubscribe()
      window.removeEventListener('beforeunload', onBeforeUnload)
      void autosave.flush().finally(() => autosave.dispose())
    }
  }, [projectId])
}
