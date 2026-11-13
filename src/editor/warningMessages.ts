import type { ClearanceSide } from '../core/clearances'
import { endLabel, resolveEnd } from '../core/pipeEnds'
import type { Pipe, Scene } from '../core/scene'
import type { ObstacleRef, SceneWarning } from '../core/sceneWarnings'
import type { Selection } from '../stores/editorStore'
import { violationText } from './ruleTexts'

const SIDES: Record<ClearanceSide, string> = {
  front: 'spredaj',
  back: 'zadaj',
  left: 'levo',
  right: 'desno',
  top: 'zgoraj',
}

/** "HP-01 / Dvižni → IDU-01 / Dvižni" (tags exactly as stored). */
export function pipeLabel(scene: Scene, pipe: Pipe): string {
  const side = (end: Pipe['from']) => {
    const resolved = resolveEnd(scene, end)
    return resolved ? endLabel(resolved) : '?'
  }
  return `${side(pipe.from)} → ${side(pipe.to)}`
}

/** Slovenian text of a warning. Tags are shown exactly as stored. */
export function warningText(warning: SceneWarning, scene: Scene): string {
  const tagOf = (id: string) => scene.equipment.find((e) => e.id === id)?.tag ?? '?'
  const obstacle = (ref: ObstacleRef) => (ref.kind === 'wall' ? 'stena' : tagOf(ref.id))
  const pipeOf = (id: string) => {
    const pipe = scene.pipes.find((p) => p.id === id)
    return pipe ? `Cev ${pipeLabel(scene, pipe)}` : 'Cev'
  }

  switch (warning.kind) {
    case 'collision':
      return warning.other.kind === 'wall'
        ? `${tagOf(warning.equipmentId)} sega v steno.`
        : `${tagOf(warning.equipmentId)} in ${tagOf(warning.other.id)} se prekrivata.`
    case 'clearance':
      return `V coni odmika naprave ${tagOf(warning.equipmentId)} (${SIDES[warning.side]}) je ${obstacle(warning.intruder)}.`
    case 'unknownSystem': {
      const item = scene.equipment.find((e) => e.id === warning.equipmentId)
      const port = item?.type.ports.find((p) => p.id === warning.portId)
      return `${tagOf(warning.equipmentId)}: priključek »${port?.name ?? '?'}« uporablja sistem, ki ga v projektu ni.`
    }
    case 'pipeNoRoute':
      return `${pipeOf(warning.pipeId)}: trasa ni speljana.${warning.reason ? ` ${warning.reason}` : ''}`
    case 'pipeDisconnected':
      return `${pipeOf(warning.pipeId)}: trasa ni več povezana s priključkom.`
    case 'pipeDiameterMismatch':
      return `${pipeOf(warning.pipeId)}: premera na koncih se razlikujeta.`
    case 'pipeClash': {
      const obstacleTag = scene.obstacles.find((o) => o.id === warning.with.id)?.tag ?? '?'
      const what =
        warning.with.kind === 'equipment'
          ? `napravo ${tagOf(warning.with.id)}`
          : warning.with.kind === 'obstacle'
            ? `oviro ${obstacleTag}`
            : `drugo cev (${pipeOf(warning.with.id).replace('Cev ', '')})`
      return `${pipeOf(warning.pipeId)}: trasa gre skozi ${what}.`
    }
    case 'ruleViolation':
      return violationText(scene, warning.violation, (id) => {
        const pipe = scene.pipes.find((p) => p.id === id)
        return pipe ? pipeLabel(scene, pipe) : '?'
      })
  }
}

/** Element to select when a warning is clicked. */
export function warningTarget(warning: SceneWarning): Selection {
  return 'pipeId' in warning
    ? { kind: 'pipe', id: warning.pipeId }
    : { kind: 'equipment', id: warning.equipmentId }
}
