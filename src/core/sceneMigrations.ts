import { initialSettings, SCENE_VERSION } from './scene'

type Obj = Record<string, unknown>

const isObj = (value: unknown): value is Obj =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/**
 * v1 -> v2 (phase 2): settings gain the list of systems. Walls, openings and all other
 * settings are kept as they are. Phase-0 scenes without settings get the initial settings.
 */
function v1ToV2(scene: Obj): Obj {
  const systems = initialSettings().systems
  const settings = isObj(scene.settings) ? { ...scene.settings, systems } : initialSettings()
  return { ...scene, version: 2, settings }
}

const MIGRATIONS: Record<number, (scene: Obj) => Obj> = { 1: v1ToV2 }

/**
 * Upgrades stored scene JSON of an older version to the current version, step by step.
 * Values it does not understand are returned unchanged for the validator to reject.
 */
export function migrateScene(json: unknown): unknown {
  let scene = json
  while (isObj(scene) && typeof scene.version === 'number' && scene.version < SCENE_VERSION) {
    const step = MIGRATIONS[scene.version]
    if (!step) return scene
    scene = step(scene)
  }
  return scene
}
