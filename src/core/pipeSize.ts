import type { Scene } from './scene'

/** Insulation thickness of a system (mm); 0 for an unknown system. */
export function insulationOf(scene: Scene, systemId: string): number {
  return scene.settings.systems.find((s) => s.id === systemId)?.insulationThickness ?? 0
}

/**
 * Diameter used for spacing and clashes: outer pipe diameter plus twice the insulation
 * of its system.
 */
export function effectiveDiameter(
  scene: Scene,
  pipe: { systemId: string; outerDiameter: number },
): number {
  return pipe.outerDiameter + 2 * insulationOf(scene, pipe.systemId)
}

/** Half of the effective diameter. */
export function effectiveRadius(
  scene: Scene,
  pipe: { systemId: string; outerDiameter: number },
): number {
  return effectiveDiameter(scene, pipe) / 2
}
