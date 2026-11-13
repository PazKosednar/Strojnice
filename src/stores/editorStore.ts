import { create } from 'zustand'
import {
  createEmptyScene,
  type EquipmentType,
  type ObstacleCategory,
  type Point3,
  type Scene,
  type ZoneKind,
} from '../core/scene'
import type { SceneResult } from '../core/sceneResult'
import type { SaveStatus } from '../lib/autosave'
import { sceneErrorMessage } from '../editor/sceneErrorMessages'
import { createHistory, pushHistory, redo, replacePresent, undo, type History } from './history'

export type Tool =
  | 'select'
  | 'wall'
  | 'door'
  | 'window'
  | 'equipment'
  | 'pipe'
  | 'terminal'
  | 'obstacle'
  | 'zone'
  | 'delete'

/** How the 3D view treats walls between the camera and the room. */
export type WallViewMode = 'hide' | 'transparent' | 'all'

export type Selection = {
  kind: 'wall' | 'opening' | 'equipment' | 'terminal' | 'pipe' | 'obstacle' | 'zone'
  id: string
} | null

export type SceneOp = (scene: Scene) => SceneResult

/** Part of the selected pipe being edited (UI state). */
export interface PipeEdit {
  segment: number | null
  vertex: number | null
}

/** What the obstacle and zone tools draw next (UI state). */
export interface SpaceDraft {
  category: ObstacleCategory
  zoneKind: ZoneKind
}

/** Values the terminal tool uses for the next wall terminal (entered by the user). */
export interface TerminalDraft {
  systemId: string
  height: number | null
  outerDiameter: number | null
}

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
  /** Systems switched off in the legend (hidden in 2D and 3D; UI state only). */
  hiddenSystems: string[]
  wallViewMode: WallViewMode
  /** Automatic routing progress: `done` of `total` pipes; total 0 = idle. */
  routing: { done: number; total: number }
  /** Incremented to ask for re-routing all automatic pipes. */
  rerouteAllRequest: number
  pipeEdit: PipeEdit
  terminalDraft: TerminalDraft
  spaceDraft: SpaceDraft
  /** Place shown in 2D and 3D (e.g. a rule violation); cleared by the next selection. */
  highlight: Point3 | null

  load: (projectId: string, scene: Scene) => void
  /** Applies an edit as one undo step. Returns false (and sets `message`) if rejected. */
  apply: (op: SceneOp) => boolean
  /** Starts a continuous edit (e.g. dragging) that becomes a single undo step. */
  beginGesture: () => void
  /** Applies a live edit during a gesture without recording a step. */
  preview: (op: SceneOp) => boolean
  /**
   * Adds a derived change (e.g. a computed pipe route) to the current step without a new
   * undo step, so undo reverts it together with the edit that caused it. Silent on error.
   */
  amend: (op: SceneOp) => boolean
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
  toggleSystem: (systemId: string) => void
  showAllSystems: () => void
  setWallViewMode: (mode: WallViewMode) => void
  setRouting: (done: number, total: number) => void
  rerouteAll: () => void
  setPipeEdit: (edit: PipeEdit) => void
  setTerminalDraft: (draft: Partial<TerminalDraft>) => void
  setSpaceDraft: (draft: Partial<SpaceDraft>) => void
  /** Selects an element and marks a place (e.g. where a rule is broken). */
  showPlace: (selection: Selection, point: Point3) => void
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
    obstacle: scene.obstacles,
    zone: scene.zones,
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
    hiddenSystems: [],
    wallViewMode: 'hide',
    routing: { done: 0, total: 0 },
    rerouteAllRequest: 0,
    pipeEdit: { segment: null, vertex: null },
    terminalDraft: { systemId: 'cold', height: null, outerDiameter: null },
    spaceDraft: { category: 'electrical', zoneKind: 'forbidden' },
    highlight: null,

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
        hiddenSystems: [],
        routing: { done: 0, total: 0 },
        highlight: null,
      })
    },
    apply: (op) => run(op, true),
    beginGesture: () => {
      gestureBase = get().history.present
    },
    preview: (op) => run(op, false),
    amend: (op) => {
      const { history, selection } = get()
      const result = op(history.present)
      if (!result.ok) return false
      set({
        history: replacePresent(history, result.scene),
        selection: validSelection(result.scene, selection),
      })
      return true
    },
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
    select: (selection) =>
      set({
        selection,
        message: null,
        pipeEdit: { segment: null, vertex: null },
        highlight: null,
      }),
    showPlace: (selection, highlight) =>
      set({ selection, message: null, pipeEdit: { segment: null, vertex: null }, highlight }),
    setTool: (tool) => set({ tool, message: null }),
    setMessage: (message) => set({ message }),
    setSaveStatus: (saveStatus) => set({ saveStatus }),
    startPlacing: (placingType) =>
      set({ placingType, tool: 'equipment', selection: null, message: null }),
    setShowClearances: (showClearances) => set({ showClearances }),
    toggleSystem: (systemId) =>
      set((s) => ({
        hiddenSystems: s.hiddenSystems.includes(systemId)
          ? s.hiddenSystems.filter((id) => id !== systemId)
          : [...s.hiddenSystems, systemId],
      })),
    showAllSystems: () => set({ hiddenSystems: [] }),
    setWallViewMode: (wallViewMode) => set({ wallViewMode }),
    setRouting: (done, total) => set({ routing: { done, total } }),
    rerouteAll: () => set((s) => ({ rerouteAllRequest: s.rerouteAllRequest + 1 })),
    setPipeEdit: (pipeEdit) => set({ pipeEdit }),
    setTerminalDraft: (draft) => set((s) => ({ terminalDraft: { ...s.terminalDraft, ...draft } })),
    setSpaceDraft: (draft) => set((s) => ({ spaceDraft: { ...s.spaceDraft, ...draft } })),
  }
})

/** Current scene (selector). */
export const selectScene = (s: EditorState) => s.history.present
