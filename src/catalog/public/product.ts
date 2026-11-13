import type { EquipmentType } from '../../core/scene'

/**
 * A product of the public catalogue: an equipment type defined in code and shown to every
 * user. Its id must be unique and never change (placed equipment keeps a copy of the type).
 */
export interface PublicProduct {
  manufacturer: string
  type: EquipmentType
}
