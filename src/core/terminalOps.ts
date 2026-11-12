import { withoutPipesAt } from './pipeOps'
import type { Scene, WallTerminal } from './scene'
import { fail, isPositiveInt, ok, type SceneResult } from './sceneResult'
import { allTags, isTagFree, nextTag } from './tags'
import { wallLength } from './wallGeometry'

/** Prefix of automatically assigned wall terminal tags. */
export const TERMINAL_TAG_PREFIX = 'IZ'

function validated(scene: Scene, t: WallTerminal): SceneResult | WallTerminal {
  const wall = scene.walls.find((w) => w.id === t.wallId)
  if (!wall) return fail('notFound')
  if (t.tag === '' || t.tag !== t.tag.trim()) return fail('tagEmpty')
  if (!isTagFree(allTags(scene), t.tag, t.id)) return fail('tagTaken')
  const length = Math.floor(wallLength(wall))
  if (!Number.isInteger(t.offset) || t.offset < 0 || t.offset > length) {
    return fail('invalidTerminal')
  }
  if (!Number.isInteger(t.height) || t.height < 0 || t.height > wall.height) {
    return fail('invalidTerminal')
  }
  if (!isPositiveInt(t.outerDiameter) || t.systemId === '') return fail('invalidTerminal')
  return t
}

export type NewTerminal = Omit<WallTerminal, 'tag'> & { tag?: string }

/** Adds a wall terminal; without a tag it gets the next IZ-NN. */
export function addTerminal(scene: Scene, input: NewTerminal): SceneResult {
  const terminal = validated(scene, {
    ...input,
    offset: Math.round(input.offset),
    tag:
      input.tag ??
      nextTag(
        TERMINAL_TAG_PREFIX,
        allTags(scene).map((t) => t.tag),
      ),
  })
  if ('ok' in terminal) return terminal
  return ok({ ...scene, terminals: [...scene.terminals, terminal] })
}

export type TerminalPatch = Partial<
  Pick<WallTerminal, 'tag' | 'offset' | 'height' | 'systemId' | 'outerDiameter'>
>

/**
 * Changes a terminal. Changing the system of a connected terminal is rejected (the pipe
 * would join two systems); disconnect the pipe first.
 */
export function updateTerminal(scene: Scene, id: string, patch: TerminalPatch): SceneResult {
  const current = scene.terminals.find((t) => t.id === id)
  if (!current) return fail('notFound')
  const connected = scene.pipes.some(
    (p) =>
      (p.from.kind === 'terminal' && p.from.terminalId === id) ||
      (p.to.kind === 'terminal' && p.to.terminalId === id),
  )
  if (patch.systemId !== undefined && patch.systemId !== current.systemId && connected) {
    return fail('pipeSystemMismatch')
  }
  const terminal = validated(scene, { ...current, ...patch })
  if ('ok' in terminal) return terminal
  return ok({ ...scene, terminals: scene.terminals.map((t) => (t.id === id ? terminal : t)) })
}

/** Removes a terminal together with the pipe attached to it. */
export function removeTerminal(scene: Scene, id: string): SceneResult {
  if (!scene.terminals.some((t) => t.id === id)) return fail('notFound')
  const next = withoutPipesAt(scene, id)
  return ok({ ...next, terminals: next.terminals.filter((t) => t.id !== id) })
}
