import type { ClearanceSide } from '../core/clearances'
import type { Scene } from '../core/scene'
import type { ObstacleRef, SceneWarning } from '../core/sceneWarnings'

const SIDES: Record<ClearanceSide, string> = {
  front: 'spredaj',
  back: 'zadaj',
  left: 'levo',
  right: 'desno',
  top: 'zgoraj',
}

/** Slovenian text of a warning. Tags are shown exactly as stored. */
export function warningText(warning: SceneWarning, scene: Scene): string {
  const tagOf = (id: string) => scene.equipment.find((e) => e.id === id)?.tag ?? '?'
  const obstacle = (ref: ObstacleRef) => (ref.kind === 'wall' ? 'stena' : tagOf(ref.id))
  const tag = tagOf(warning.equipmentId)

  switch (warning.kind) {
    case 'collision':
      return warning.other.kind === 'wall'
        ? `${tag} sega v steno.`
        : `${tag} in ${tagOf(warning.other.id)} se prekrivata.`
    case 'clearance':
      return `V coni odmika naprave ${tag} (${SIDES[warning.side]}) je ${obstacle(warning.intruder)}.`
    case 'unknownSystem': {
      const item = scene.equipment.find((e) => e.id === warning.equipmentId)
      const port = item?.type.ports.find((p) => p.id === warning.portId)
      return `${tag}: priključek »${port?.name ?? '?'}« uporablja sistem, ki ga v projektu ni.`
    }
  }
}
