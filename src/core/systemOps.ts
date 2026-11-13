import type { Scene, SystemDef } from './scene'
import { fail, ok, type SceneResult } from './sceneResult'

const validColor = (color: string) => /^#[0-9a-fA-F]{6}$/.test(color)
const validInsulation = (mm: number) => Number.isInteger(mm) && mm >= 0

function withSystems(scene: Scene, systems: SystemDef[]): Scene {
  return { ...scene, settings: { ...scene.settings, systems } }
}

/** Adds a system (medium) to the project. */
export function addSystem(scene: Scene, system: SystemDef): SceneResult {
  const name = system.name.trim()
  if (system.id === '' || name === '' || !validColor(system.color)) return fail('invalidSystem')
  if (!validInsulation(system.insulationThickness)) return fail('invalidSystem')
  if (scene.settings.systems.some((s) => s.id === system.id)) return fail('invalidSystem')
  return ok(withSystems(scene, [...scene.settings.systems, { ...system, name }]))
}

/** Changes the name, colour, line style or insulation of a system. Its id never changes. */
export function updateSystem(
  scene: Scene,
  id: string,
  patch: Partial<Pick<SystemDef, 'name' | 'color' | 'lineStyle' | 'insulationThickness'>>,
): SceneResult {
  const current = scene.settings.systems.find((s) => s.id === id)
  if (!current) return fail('notFound')
  const updated = { ...current, ...patch, name: (patch.name ?? current.name).trim() }
  if (updated.name === '' || !validColor(updated.color)) return fail('invalidSystem')
  if (!validInsulation(updated.insulationThickness)) return fail('invalidSystem')
  return ok(
    withSystems(
      scene,
      scene.settings.systems.map((s) => (s.id === id ? updated : s)),
    ),
  )
}

/**
 * Removes a system. Ports that still refer to it are kept and reported by sceneWarnings
 * as using an unknown system.
 */
export function removeSystem(scene: Scene, id: string): SceneResult {
  if (!scene.settings.systems.some((s) => s.id === id)) return fail('notFound')
  return ok(
    withSystems(
      scene,
      scene.settings.systems.filter((s) => s.id !== id),
    ),
  )
}
