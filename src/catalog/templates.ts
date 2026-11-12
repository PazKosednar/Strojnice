import type { Mounting } from '../core/scene'

/**
 * Starting points for a new equipment type. A template fixes only the shape, the tag
 * prefix and the mounting; every dimension, port and clearance is entered by the user
 * from the manufacturer's documentation.
 */
export interface EquipmentTemplate {
  key: string
  label: string
  shapeKind: 'box' | 'cylinder'
  tagPrefix: string
  mounting: Mounting
}

export const EQUIPMENT_TEMPLATES: readonly EquipmentTemplate[] = [
  {
    key: 'outdoor',
    label: 'Zunanja enota TČ',
    shapeKind: 'box',
    tagPrefix: 'HP',
    mounting: 'floor',
  },
  { key: 'indoor', label: 'Notranja enota', shapeKind: 'box', tagPrefix: 'IDU', mounting: 'wall' },
  {
    key: 'cylinder',
    label: 'Hranilnik',
    shapeKind: 'cylinder',
    tagPrefix: 'CYL',
    mounting: 'floor',
  },
  {
    key: 'expansion',
    label: 'Raztezna posoda',
    shapeKind: 'cylinder',
    tagPrefix: 'EV',
    mounting: 'wall',
  },
  { key: 'manifold', label: 'Razdelilnik', shapeKind: 'box', tagPrefix: 'MF', mounting: 'wall' },
  {
    key: 'generic',
    label: 'Splošna naprava',
    shapeKind: 'box',
    tagPrefix: 'EQ',
    mounting: 'floor',
  },
]
