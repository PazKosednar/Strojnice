import type { OpeningError } from './openingValidation'
import type { Scene } from './scene'

/** Reasons a scene operation can be rejected. The UI maps them to messages. */
export type SceneError =
  | OpeningError
  /** Referenced element does not exist. */
  | 'notFound'
  /** A wall would get zero length. */
  | 'wallTooShort'
  /** A numeric value is not a positive integer (mm). */
  | 'invalidValue'
  /** After the change an existing opening would no longer fit its wall. */
  | 'openingsDoNotFit'
  /** Equipment tag is empty (or has leading/trailing spaces). */
  | 'tagEmpty'
  /** Another equipment item already uses this tag. */
  | 'tagTaken'
  /** Position, elevation or rotation is not a valid integer value. */
  | 'invalidPlacement'
  /** System name is empty, its colour is not #rrggbb, or its id is already used. */
  | 'invalidSystem'
  /** Both ends of a pipe must belong to the same system. */
  | 'pipeSystemMismatch'
  /** A port or terminal already has a pipe. */
  | 'pipeEndInUse'
  /** A port has no outer diameter yet. */
  | 'pipeEndNoDiameter'
  /** A pipe cannot start and end at the same place. */
  | 'pipeSameEnd'
  /** A route must consist of integer, axis-parallel segments. */
  | 'invalidRoute'
  /** Terminal offset/height/diameter/system is not valid for its wall. */
  | 'invalidTerminal'

/** Result of a scene operation: a new scene, or the reason it was rejected. */
export type SceneResult = { ok: true; scene: Scene } | { ok: false; error: SceneError }

export const ok = (scene: Scene): SceneResult => ({ ok: true, scene })
export const fail = (error: SceneError): SceneResult => ({ ok: false, error })

export const isPositiveInt = (v: number) => Number.isInteger(v) && v > 0
