import { addPipe } from '../pipeOps'
import { endDiameter, endLabel, endSystemId, pipeEndKey, resolveEnd } from '../pipeEnds'
import type { IdFactory, PipeEnd, Scene } from '../scene'
import { fail, ok, type SceneResult } from '../sceneResult'

/** Why two ends are proposed together. */
export type ProposalReason = 'key' | 'onlyCandidate' | 'ambiguous'

/**
 * A proposed pipe. For 'key' and 'onlyCandidate' `to` is set; for 'ambiguous' it is null
 * and `candidates` lists the possible partners for the user to choose from.
 */
export interface ConnectionProposal {
  /** Stable id: the key of `from`. */
  id: string
  from: PipeEnd
  to: PipeEnd | null
  reason: ProposalReason
  candidates: PipeEnd[]
  systemId: string
}

interface FreeEnd {
  end: PipeEnd
  key: string
  /** Equipment id, or the terminal id (an end never pairs with its own owner). */
  owner: string
  label: string
  systemId: string
  diameter: number
  connectionKey?: string
  flow?: 'out' | 'in'
}

/** Ends without a pipe that can be connected (ports need an outer diameter). */
function freeEnds(scene: Scene): FreeEnd[] {
  const used = new Set(scene.pipes.flatMap((p) => [pipeEndKey(p.from), pipeEndKey(p.to)]))
  const ends: PipeEnd[] = [
    ...scene.equipment.flatMap((e) =>
      e.type.ports.map((p): PipeEnd => ({ kind: 'port', equipmentId: e.id, portId: p.id })),
    ),
    ...scene.terminals.map((t): PipeEnd => ({ kind: 'terminal', terminalId: t.id })),
  ]
  const out: FreeEnd[] = []
  for (const end of ends) {
    const key = pipeEndKey(end)
    if (used.has(key)) continue
    const resolved = resolveEnd(scene, end)
    const diameter = resolved ? endDiameter(resolved) : undefined
    if (!resolved || diameter === undefined) continue
    out.push({
      end,
      key,
      owner: end.kind === 'port' ? end.equipmentId : end.terminalId,
      label: endLabel(resolved),
      systemId: endSystemId(resolved),
      diameter,
      ...(resolved.kind === 'port' && resolved.port.connectionKey && resolved.port.flow
        ? { connectionKey: resolved.port.connectionKey, flow: resolved.port.flow }
        : {}),
    })
  }
  // Deterministic order: by label (tags are exact identifiers), then by key.
  return out.sort((a, b) =>
    a.label === b.label ? (a.key < b.key ? -1 : 1) : a.label < b.label ? -1 : 1,
  )
}

/**
 * Which free ends belong together:
 * - 'key': same connection key, opposite flow, different equipment, same system (out -> in),
 * - 'onlyCandidate': without a key, the two ends are each other's only free end of the same
 *   system and outer diameter on another item,
 * - 'ambiguous': an end without a key that has several such candidates; the user chooses.
 * Ends with a key pair only by their key. Nothing is connected here.
 */
export function proposeConnections(scene: Scene): ConnectionProposal[] {
  const ends = freeEnds(scene)
  const proposals: ConnectionProposal[] = []

  const keyed = ends.filter((e) => e.connectionKey !== undefined)
  for (const out of keyed.filter((e) => e.flow === 'out')) {
    const partners = keyed.filter(
      (e) =>
        e.flow === 'in' &&
        e.connectionKey === out.connectionKey &&
        e.owner !== out.owner &&
        e.systemId === out.systemId,
    )
    if (partners.length === 0) continue
    const ins = keyed.filter((e) => e.flow === 'in' && e.connectionKey === out.connectionKey)
    const outs = keyed.filter((e) => e.flow === 'out' && e.connectionKey === out.connectionKey)
    const unique = partners.length === 1 && ins.length === 1 && outs.length === 1
    proposals.push({
      id: out.key,
      from: out.end,
      to: unique ? partners[0]!.end : null,
      reason: unique ? 'key' : 'ambiguous',
      candidates: partners.map((p) => p.end),
      systemId: out.systemId,
    })
  }

  const plain = ends.filter((e) => e.connectionKey === undefined)
  const candidatesOf = (e: FreeEnd) =>
    plain.filter(
      (o) =>
        o.owner !== e.owner &&
        o.systemId === e.systemId &&
        o.diameter === e.diameter &&
        o.key !== e.key,
    )
  const listed = new Set<string>()
  for (const e of plain) {
    if (listed.has(e.key)) continue
    const candidates = candidatesOf(e)
    if (candidates.length === 0) continue
    const only = candidates.length === 1 ? candidates[0]! : null
    if (only && candidatesOf(only).length === 1) {
      listed.add(e.key)
      listed.add(only.key)
      proposals.push({
        id: e.key,
        from: e.end,
        to: only.end,
        reason: 'onlyCandidate',
        candidates: [only.end],
        systemId: e.systemId,
      })
      continue
    }
    listed.add(e.key)
    proposals.push({
      id: e.key,
      from: e.end,
      to: null,
      reason: 'ambiguous',
      candidates: candidates.map((c) => c.end),
      systemId: e.systemId,
    })
  }
  return proposals
}

/** A pair the user confirmed. */
export interface ChosenPair {
  from: PipeEnd
  to: PipeEnd
}

/**
 * Adds automatic pipes (without a route) for the confirmed pairs, in the given order.
 * Rejects the whole set when an end is used twice or a pair cannot be connected.
 */
export function addChosenPipes(
  scene: Scene,
  pairs: readonly ChosenPair[],
  newId: IdFactory,
): SceneResult & { ids?: string[] } {
  const seen = new Set<string>()
  for (const { from, to } of pairs) {
    for (const key of [pipeEndKey(from), pipeEndKey(to)]) {
      if (seen.has(key)) return fail('pipeEndInUse')
      seen.add(key)
    }
  }
  let next = scene
  const ids: string[] = []
  for (const pair of pairs) {
    const id = newId()
    const result = addPipe(next, { id, ...pair })
    if (!result.ok) return result
    next = result.scene
    ids.push(id)
  }
  return { ...ok(next), ids }
}
