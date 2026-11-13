import { create } from 'zustand'
import {
  proposeConnections,
  type ChosenPair,
  type ConnectionProposal,
} from '../core/connect/proposeConnections'
import { pipeEndKey } from '../core/pipeEnds'
import type { PipeEnd, Scene } from '../core/scene'

/** What the user decided for one proposal. */
export interface ProposalChoice {
  enabled: boolean
  /** Key of the chosen partner end (pipeEndKey), or null when none is chosen yet. */
  partner: string | null
}

export type AutoConnectStage = 'closed' | 'proposals' | 'routing' | 'preview'

interface AutoConnectState {
  stage: AutoConnectStage
  /** Scene the proposal was made for; accepting checks it is still the current one. */
  base: Scene | null
  proposals: ConnectionProposal[]
  choices: Record<string, ProposalChoice>
  progress: { done: number; total: number }
  /** Base scene with the proposed pipes and their routes (or failure reasons). */
  preview: Scene | null
  /** Ids of the proposed pipes in the preview, and those chosen for accepting. */
  previewIds: string[]
  selected: string[]
  message: string | null

  open: (scene: Scene) => void
  close: () => void
  setEnabled: (proposalId: string, enabled: boolean) => void
  setPartner: (proposalId: string, partner: string | null) => void
  startRouting: (total: number) => void
  setProgress: (done: number, total: number) => void
  showPreview: (preview: Scene, ids: string[]) => void
  toggleSelected: (pipeId: string) => void
  backToProposals: () => void
  setMessage: (message: string | null) => void
}

const CLOSED = {
  stage: 'closed' as const,
  base: null,
  proposals: [],
  choices: {},
  progress: { done: 0, total: 0 },
  preview: null,
  previewIds: [],
  selected: [],
  message: null,
}

export const useAutoConnectStore = create<AutoConnectState>()((set) => ({
  ...CLOSED,

  open: (scene) => {
    const proposals = proposeConnections(scene)
    const choices: Record<string, ProposalChoice> = {}
    for (const p of proposals) {
      // Pairs by key or only candidate are on; ambiguous ones wait for the user's choice.
      choices[p.id] = { enabled: p.to !== null, partner: p.to ? pipeEndKey(p.to) : null }
    }
    set({ ...CLOSED, stage: 'proposals', base: scene, proposals, choices })
  },
  close: () => set(CLOSED),
  setEnabled: (id, enabled) =>
    set((s) => ({ choices: { ...s.choices, [id]: { ...s.choices[id]!, enabled } } })),
  setPartner: (id, partner) =>
    set((s) => ({
      choices: { ...s.choices, [id]: { enabled: partner !== null, partner } },
    })),
  startRouting: (total) => set({ stage: 'routing', progress: { done: 0, total }, message: null }),
  setProgress: (done, total) => set({ progress: { done, total } }),
  showPreview: (preview, ids) =>
    set({
      stage: 'preview',
      preview,
      previewIds: ids,
      // Pipes that could not be routed are not selected for accepting.
      selected: ids.filter((id) => (preview.pipes.find((p) => p.id === id)?.route.length ?? 0) > 1),
    }),
  toggleSelected: (id) =>
    set((s) => ({
      selected: s.selected.includes(id) ? s.selected.filter((x) => x !== id) : [...s.selected, id],
    })),
  backToProposals: () => set({ stage: 'proposals', preview: null, previewIds: [], selected: [] }),
  setMessage: (message) => set({ message }),
}))

/**
 * The confirmed pairs: enabled proposals with a partner. Returns a Slovenian message when
 * an end is chosen twice.
 */
export function chosenPairs(
  proposals: readonly ConnectionProposal[],
  choices: Readonly<Record<string, ProposalChoice>>,
): { pairs: ChosenPair[] } | { error: string } {
  const pairs: ChosenPair[] = []
  const used = new Set<string>()
  for (const p of proposals) {
    const choice = choices[p.id]
    if (!choice?.enabled || choice.partner === null) continue
    const partner: PipeEnd | undefined = p.candidates.find((c) => pipeEndKey(c) === choice.partner)
    if (!partner) continue
    for (const key of [pipeEndKey(p.from), pipeEndKey(partner)]) {
      if (used.has(key)) {
        return { error: 'Isti priključek je izbran dvakrat. Vsak priključek ima lahko le eno cev.' }
      }
      used.add(key)
    }
    pairs.push({ from: p.from, to: partner })
  }
  return { pairs }
}
