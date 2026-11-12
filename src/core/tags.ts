/**
 * Equipment tags (e.g. HP-01) are exact identifiers: they are compared character by
 * character, never normalised and never renumbered.
 */

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Next tag for a prefix: `PREFIX-NN` with the number after the highest one already used
 * for that prefix (at least two digits). Numbers freed by deleted equipment are not reused
 * while a higher number exists, so an old tag never silently moves to another item.
 */
export function nextTag(prefix: string, existingTags: readonly string[]): string {
  const pattern = new RegExp(`^${escapeRegExp(prefix)}-(\\d+)$`)
  let highest = 0
  for (const tag of existingTags) {
    const match = pattern.exec(tag)
    if (match) highest = Math.max(highest, Number(match[1]))
  }
  return `${prefix}-${String(highest + 1).padStart(2, '0')}`
}

/** Everything in a scene that carries a tag; tags are unique across all of it. */
export function allTags(scene: {
  equipment: readonly { id: string; tag: string }[]
  terminals: readonly { id: string; tag: string }[]
}): { id: string; tag: string }[] {
  return [...scene.equipment, ...scene.terminals].map(({ id, tag }) => ({ id, tag }))
}

/** True when no other item (ignoring `exceptId`) uses exactly this tag. */
export function isTagFree(
  items: readonly { id: string; tag: string }[],
  tag: string,
  exceptId?: string,
): boolean {
  return !items.some((item) => item.tag === tag && item.id !== exceptId)
}
