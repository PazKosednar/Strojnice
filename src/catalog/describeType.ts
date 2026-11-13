import type { EquipmentType } from '../core/scene'

/** One-line summary of a type in catalogue lists. */
export function describeType(type: EquipmentType): string {
  const { shape } = type
  const size =
    shape.kind === 'box'
      ? `${shape.width} × ${shape.depth} × ${shape.height} mm`
      : `⌀ ${shape.diameter} × ${shape.height} mm`
  const mounting = type.mounting === 'wall' ? 'stenska' : 'talna'
  const model = type.model ? ' · 3D model' : ''
  return `${type.tagPrefix} · ${size} · ${mounting} · priključkov: ${type.ports.length}${model}`
}
