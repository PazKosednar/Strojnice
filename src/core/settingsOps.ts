import type { OpeningPreset, Scene, SceneSettings } from './scene'
import { fail, isPositiveInt, ok, type SceneResult } from './sceneResult'

const validPreset = (p: OpeningPreset) =>
  isPositiveInt(p.width) &&
  isPositiveInt(p.height) &&
  Number.isInteger(p.sillHeight) &&
  p.sillHeight >= 0

/**
 * Updates project settings (values used for new elements). Existing walls and
 * openings are not changed. Door sill is always 0.
 */
export function updateSettings(scene: Scene, patch: Partial<SceneSettings>): SceneResult {
  const settings: SceneSettings = { ...scene.settings, ...patch }
  settings.door = { ...settings.door, sillHeight: 0 }
  if (
    !isPositiveInt(settings.wallThickness) ||
    !isPositiveInt(settings.wallHeight) ||
    !isPositiveInt(settings.gridSize) ||
    !validPreset(settings.door) ||
    !validPreset(settings.window)
  ) {
    return fail('invalidValue')
  }
  return ok({ ...scene, settings })
}
