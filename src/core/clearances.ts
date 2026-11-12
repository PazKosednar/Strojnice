import type { Body } from './collisions'
import { equipmentHeight, footprintSize, localRect } from './equipmentGeometry'
import type { Clearances, Equipment } from './scene'

export type ClearanceSide = keyof Clearances

export const CLEARANCE_SIDES: readonly ClearanceSide[] = ['front', 'back', 'left', 'right', 'top']

export interface ClearanceZone extends Body {
  side: ClearanceSide
}

/**
 * Free-space zones required around placed equipment. Side zones are boxes as wide as the
 * face they belong to and as tall as the equipment; the top zone sits above it. A cylinder
 * uses the square around its diameter. Sides with clearance 0 produce no zone.
 */
export function clearanceZones(equipment: Equipment): ClearanceZone[] {
  const c = equipment.type.clearances
  if (!c) return []
  const { width, depth } = footprintSize(equipment.type)
  const hw = width / 2
  const hd = depth / 2
  const z0 = equipment.elevation
  const z1 = z0 + equipmentHeight(equipment.type)
  const rect = (x0: number, y0: number, x1: number, y1: number) => ({
    kind: 'polygon' as const,
    points: localRect(equipment, x0, y0, x1, y1),
  })

  const zones: ClearanceZone[] = []
  if (c.front > 0)
    zones.push({ side: 'front', footprint: rect(-hw, -hd - c.front, hw, -hd), z0, z1 })
  if (c.back > 0) zones.push({ side: 'back', footprint: rect(-hw, hd, hw, hd + c.back), z0, z1 })
  if (c.left > 0) zones.push({ side: 'left', footprint: rect(-hw - c.left, -hd, -hw, hd), z0, z1 })
  if (c.right > 0) zones.push({ side: 'right', footprint: rect(hw, -hd, hw + c.right, hd), z0, z1 })
  if (c.top > 0)
    zones.push({ side: 'top', footprint: rect(-hw, -hd, hw, hd), z0: z1, z1: z1 + c.top })
  return zones
}
