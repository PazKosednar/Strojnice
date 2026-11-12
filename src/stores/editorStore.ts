import { create } from 'zustand'
import { createEmptyScene, type EquipmentType, type Scene } from '../core/scene'
import type { SceneResult } from '../core/sceneResult'
import type { SaveStatus } from '../lib/autosave'
import { sceneErrorMessage } from '../editor/sceneErrorMessages'
import { createHistory, pushHistory, redo, replacePresent, undo, type History } from './history'

export type Tool = 'select' | 'wall' | 'door' | 'window' | 'equipment' | 'delete'

export type Selection = {
  kind: 'wall' | 'opening' | 'equipment' | 'terminal' | 'pipe'
  id: string
} | null

export type SceneOp = (scene: Scene) => SceneResult

interface EditorState {
  projectId: string | null
  history: History<Scene>
  selection: Selection
  tool: Tool
  /** Slovenian message about the last rejected edit. */
  message: string | null
  saveStatus: SaveStatus
  /** Catalogue type the equipment tool places (UI state, not part of the scene). */
  placingType: EquipmentType | null
  /** Whether clearance zones are drawn in the plan. */
  showClearances: boolean

  load: (projectId: string, scene: Scene) => void
  /** Applies an edit as one undo step. Returns false (and sets `message`) if rejected. */
  apply: (op: SceneOp) => boolean
  /** Starts a continuous edit (e.g. dragging) that becomes a single undo step. */
  beginGesture: () => void
  /** Applies a live edit during a gesture without recording a step. */
  preview: (op: SceneOp) => boolean
  endGesture: () => void
  undo: () => void
  redo: () => void
  select: (selection: Selection) => void
  setTool: (tool: Tool) => void
  setMessage: (message: string | null) => void
  setSaveStatus: (status: SaveStatus) => void
  /** Activates the equipment tool for a catalogue type. */
  startPlacing: (type: EquipmentType) => void
  setShowClearances: (show: boolean) => void
}

let gestureBase: Scene | null = null

/** Drops the selection if the selected element no longer exists. */
function validSelection(scene: Scene, selection: Selection): Selection {
  if (!selection) return null
  const lists = {
    wall: scene.walls,
    opening: scene.openings,
    equipment: scene.equipment,
    terminal: scene.terminals,
    pipe: scene.pipes,
  }
  const list: readonly { id: string }[] = lists[selection.kind]
  return list.some((e) => e.id === selection.id) ? selection : null
}

export const useEditorStore = create<EditorState>()((set, get) => {
  const run = (op: SceneOp, record: boolean): boolean => {
    const { history, selection } = get()
    const result = op(history.present)
    if (!result.ok) {
      set({ message: sceneErrorMessage(result.error) })
      return false
    }
    const next = record ? pushHistory(history, result.scene) : replacePresent(history, result.scene)
    set({ history: next, message: null, selection: validSelection(result.scene, selection) })
    return true
  }

  const travel = (move: (h: History<Scene>) => History<Scene>) => {
    const { history, selection } = get()
    const next = move(history)
    set({ history: next, message: null, selection: validSelection(next.present, selection) })
  }

  return {
    projectId: null,
    history: createHistory(createEmptyScene()),
    selection: null,
    tool: 'select',
    message: null,
    saveStatus: 'saved',
    placingType: null,
    showClearances: true,

    load: (projectId, scene) => {
      gestureBase = null
      set({
        projectId,
        history: createHistory(scene),
        selection: null,
        tool: 'select',
        message: null,
        saveStatus: 'saved',
        placingType: null,
      })
    },
    apply: (op) => run(op, true),
    beginGesture: () => {
      gestureBase = get().history.present
    },
    preview: (op) => run(op, false),
    endGesture: () => {
      const base = gestureBase
      gestureBase = null
      if (!base) return
      const { history } = get()
      if (history.present === base) return
      set({ history: pushHistory({ ...history, present: base }, history.present) })
    },
    undo: () => travel(undo),
    redo: () => travel(redo),
    select: (selection) => set({ selection, message: null }),
    setTool: (tool) => set({ tool, message: null }),
    setMessage: (message) => set({ message }),
    setSaveStatus: (saveStatus) => set({ saveStatus }),
    startPlacing: (placingType) =>
      set({ placingType, tool: 'equipment', selection: null, message: null }),
    setShowClearances: (showClearances) => set({ showClearances }),
  }
})

/** Current scene (selector). */
export const selectScene = (s: EditorState) => s.history.present
