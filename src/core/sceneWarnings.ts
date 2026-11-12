import { clearanceZones, type ClearanceSide } from './clearances'
import { bodiesCollide, type Body } from './collisions'
import { equipmentFootprint, equipmentHeight } from './equipmentGeometry'
import { diameterMismatch, pipeClashes, routeDisconnected, type PipeClash } from './pipeChecks'
import type { Equipment, Scene } from './scene'
import { wallExtensions, wallOutline } from './wallJoins'

export interface ObstacleRef {
  kind: 'equipment' | 'wall'
  id: string
}

/**
 * Problems worth showing to the user. They are warnings, never blockers: equipment may be
 * outside the room on purpose (outdoor unit) or right next to another item.
 */
export type SceneWarning =
  /** Two bodies intersect. Equipment pairs are reported once. */
  | { kind: 'collision'; equipmentId: string; other: ObstacleRef }
  /** Something stands in the required free space of `equipmentId`. */
  | { kind: 'clearance'; equipmentId: string; side: ClearanceSide; intruder: ObstacleRef }
  /** A port refers to a system that is not defined in this project. */
  | { kind: 'unknownSystem'; equipmentId: string; portId: string; systemId: string }
  /** Automatic routing found no route; `reason` is the stored Slovenian message. */
  | { kind: 'pipeNoRoute'; pipeId: string; reason: string }
  /** A manual route no longer starts/ends at its connection points. */
  | { kind: 'pipeDisconnected'; pipeId: string }
  /** The two ends of a pipe have different outer diameters. */
  | { kind: 'pipeDiameterMismatch'; pipeId: string }
  /** A manual route runs through equipment or another pipe. */
  | { kind: 'pipeClash'; pipeId: string; with: PipeClash }

export function equipmentBody(equipment: Equipment): Body {
  return {
    footprint: equipmentFootprint(equipment),
    z0: equipment.elevation,
    z1: equipment.elevation + equipmentHeight(equipment.type),
  }
}

/** Wall bodies (full height, corners closed; openings are not cut out). */
export function wallBodies(scene: Scene): { id: string; body: Body }[] {
  const extensions = wallExtensions(scene.walls)
  return scene.walls.map((wall) => ({
    id: wall.id,
    body: {
      footprint: { kind: 'polygon', points: wallOutline(wall, extensions.get(wall.id)) },
      z0: 0,
      z1: wall.height,
    },
  }))
}

/** All collisions, clearance violations and unknown systems in the scene. */
export function sceneWarnings(scene: Scene): SceneWarning[] {
  const warnings: SceneWarning[] = []
  const walls = wallBodies(scene)
  const items = scene.equipment.map((equipment) => ({ equipment, body: equipmentBody(equipment) }))
  const systemIds = new Set(scene.settings.systems.map((s) => s.id))

  items.forEach(({ equipment, body }, i) => {
    for (const other of items.slice(i + 1)) {
      if (bodiesCollide(body, other.body)) {
        warnings.push({
          kind: 'collision',
          equipmentId: equipment.id,
          other: { kind: 'equipment', id: other.equipment.id },
        })
      }
    }
    for (const wall of walls) {
      if (bodiesCollide(body, wall.body)) {
        warnings.push({
          kind: 'collision',
          equipmentId: equipment.id,
          other: { kind: 'wall', id: wall.id },
        })
      }
    }
  })

  for (const { equipment } of items) {
    for (const zone of clearanceZones(equipment)) {
      for (const other of items) {
        if (other.equipment.id !== equipment.id && bodiesCollide(zone, other.body)) {
          warnings.push({
            kind: 'clearance',
            equipmentId: equipment.id,
            side: zone.side,
            intruder: { kind: 'equipment', id: other.equipment.id },
          })
        }
      }
      for (const wall of walls) {
        if (bodiesCollide(zone, wall.body)) {
          warnings.push({
            kind: 'clearance',
            equipmentId: equipment.id,
            side: zone.side,
            intruder: { kind: 'wall', id: wall.id },
          })
        }
      }
    }
  }

  for (const pipe of scene.pipes) {
    if (pipe.route.length === 0) {
      warnings.push({ kind: 'pipeNoRoute', pipeId: pipe.id, reason: pipe.routeError ?? '' })
      continue
    }
    if (pipe.mode === 'manual') {
      if (routeDisconnected(scene, pipe))
        warnings.push({ kind: 'pipeDisconnected', pipeId: pipe.id })
      for (const clash of pipeClashes(scene, pipe)) {
        warnings.push({ kind: 'pipeClash', pipeId: pipe.id, with: clash })
      }
    }
  }
  for (const pipe of scene.pipes) {
    if (diameterMismatch(scene, pipe)) {
      warnings.push({ kind: 'pipeDiameterMismatch', pipeId: pipe.id })
    }
  }

  for (const { equipment } of items) {
    for (const port of equipment.type.ports) {
      if (!systemIds.has(port.systemId)) {
        warnings.push({
          kind: 'unknownSystem',
          equipmentId: equipment.id,
          portId: port.id,
          systemId: port.systemId,
        })
      }
    }
  }
  return warnings
}

/** Ids of all equipment involved in collisions or clearance violations (for highlighting). */
export function equipmentWithConflicts(warnings: readonly SceneWarning[]): Set<string> {
  const ids = new Set<string>()
  for (const w of warnings) {
    if (w.kind !== 'collision' && w.kind !== 'clearance') continue
    ids.add(w.equipmentId)
    const ref = w.kind === 'collision' ? w.other : w.intruder
    if (ref.kind === 'equipment') ids.add(ref.id)
  }
  return ids
}
