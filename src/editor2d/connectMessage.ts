import { endLabel, resolveEnd } from '../core/pipeEnds'
import { checkConnection } from '../core/pipeOps'
import type { PipeEnd, Scene } from '../core/scene'
import type { SceneError } from '../core/sceneResult'
import { sceneErrorMessage } from '../editor/sceneErrorMessages'

const SHORT: Partial<Record<SceneError, string>> = {
  pipeSystemMismatch: 'drug sistem',
  pipeEndInUse: 'že povezan',
  pipeEndNoDiameter: 'brez premera',
  pipeSameEnd: 'isti konec',
}

/**
 * Why `source` cannot be connected to the clicked end(s). With several ends at the clicked
 * spot (ports above each other) every one is listed with its reason, e.g.
 * "Na tem mestu ni ustreznega priključka: CYL-01 / Grelnik (že povezan), ...".
 */
export function connectionRejection(
  scene: Scene,
  source: PipeEnd,
  candidates: readonly PipeEnd[],
): string {
  const reasons = candidates.map((end) => {
    const check = checkConnection(scene, source, end)
    return { end, error: check.ok ? null : check.error }
  })
  if (reasons.length === 1) {
    const error = reasons[0]!.error
    return error ? sceneErrorMessage(error) : ''
  }
  const list = reasons
    .map(({ end, error }) => {
      const resolved = resolveEnd(scene, end)
      const label = resolved ? endLabel(resolved) : '?'
      return `${label} (${error ? (SHORT[error] ?? sceneErrorMessage(error)) : 'ustrezen'})`
    })
    .join(', ')
  return `Na tem mestu ni ustreznega priključka: ${list}.`
}
