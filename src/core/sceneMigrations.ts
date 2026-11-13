import { initialSettings, SCENE_VERSION } from './scene'

type Obj = Record<string, unknown>

const isObj = (value: unknown): value is Obj =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/**
 * v1 -> v2 (phase 2): settings gain the list of systems. Walls, openings and all other
 * settings are kept as they are. Phase-0 scenes without settings get the initial settings.
 */
function v1ToV2(scene: Obj): Obj {
  // Version 2 had systems without line styles; v2ToV3 adds them.
  const systems = initialSettings().systems.map(({ id, name, color }) => ({ id, name, color }))
  const initial = initialSettings()
  const settings = isObj(scene.settings)
    ? { ...scene.settings, systems }
    : {
        wallThickness: initial.wallThickness,
        wallHeight: initial.wallHeight,
        door: initial.door,
        window: initial.window,
        gridSize: initial.gridSize,
        systems,
      }
  return { ...scene, version: 2, settings }
}

/** Line styles of the four initial systems (v2 systems had none). */
const INITIAL_LINE_STYLES: Record<string, string> = {
  supply: 'solid',
  return: 'dashed',
  dhw: 'dashdot',
  cold: 'solid',
}

/**
 * v2 -> v3 (phase 3): systems gain a line style, settings gain the routing values, the
 * scene gains wall terminals. Everything else (pipes were always empty) is kept.
 */
function v2ToV3(scene: Obj): Obj {
  const initial = initialSettings()
  const settings = isObj(scene.settings) ? scene.settings : {}
  const systems = Array.isArray(settings.systems)
    ? settings.systems.map((system: unknown) =>
        isObj(system)
          ? {
              ...system,
              lineStyle:
                (typeof system.id === 'string' && INITIAL_LINE_STYLES[system.id]) || 'solid',
            }
          : system,
      )
    : settings.systems
  return {
    ...scene,
    version: 3,
    settings: {
      ...settings,
      systems,
      routingGrid: initial.routingGrid,
      portStraight: initial.portStraight,
      pipeSpacing: initial.pipeSpacing,
    },
    terminals: [],
  }
}

/**
 * v3 -> v4: equipment types may carry an optional 3D model. Nothing to convert; only the
 * version changes, so every change of the stored shape stays visible in the version.
 */
function v3ToV4(scene: Obj): Obj {
  return { ...scene, version: 4 }
}

/**
 * v4 -> v5 (phase 3b): systems gain an insulation thickness (0 = none, as before), the
 * scene gains obstacles, zones and project rules (all empty). Nothing else changes.
 */
function v4ToV5(scene: Obj): Obj {
  const settings = isObj(scene.settings) ? scene.settings : {}
  const systems = Array.isArray(settings.systems)
    ? settings.systems.map((system: unknown) =>
        isObj(system) ? { ...system, insulationThickness: 0 } : system,
      )
    : settings.systems
  return {
    ...scene,
    version: 5,
    settings: { ...settings, systems },
    obstacles: [],
    zones: [],
    rules: [],
  }
}

/**
 * v5 -> v6 (phase 3b, part B): ports may carry an optional connection key and flow. Nothing
 * to convert; only the version changes.
 */
function v5ToV6(scene: Obj): Obj {
  return { ...scene, version: 6 }
}

const MIGRATIONS: Record<number, (scene: Obj) => Obj> = {
  1: v1ToV2,
  2: v2ToV3,
  3: v3ToV4,
  4: v4ToV5,
  5: v5ToV6,
}

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
