import { MAX_TAG_PREFIX_LENGTH } from '../core/equipmentType'
import type {
  Clearances,
  EquipmentModel,
  EquipmentShape,
  EquipmentType,
  Mounting,
  Port,
  PortDirection,
} from '../core/scene'
import type { EquipmentTemplate } from './templates'

/** Form state of a port: numbers are kept as typed text until the form is saved. */
export interface PortDraft {
  id: string
  name: string
  systemId: string
  x: string
  y: string
  z: string
  direction: PortDirection
  size: string
  /** Outer pipe diameter (mm); empty = not entered yet. */
  outerDiameter: string
}

export type ClearanceSideKey = keyof Clearances

/** Form state of an equipment type. Dimension fields start empty and are required. */
export interface TypeDraft {
  id: string
  name: string
  tagPrefix: string
  shapeKind: 'box' | 'cylinder'
  mounting: Mounting
  width: string
  depth: string
  diameter: string
  height: string
  /** Empty means no clearance on that side. */
  clearances: Record<ClearanceSideKey, string>
  ports: PortDraft[]
  /** Optional manufacturer 3D model (already uploaded). */
  model?: EquipmentModel
}

const EMPTY_CLEARANCES: Record<ClearanceSideKey, string> = {
  front: '',
  back: '',
  left: '',
  right: '',
  top: '',
}

/** New draft from a template: shape, prefix and mounting only; all dimensions empty. */
export function draftFromTemplate(template: EquipmentTemplate, id: string): TypeDraft {
  return {
    id,
    name: template.label,
    tagPrefix: template.tagPrefix,
    shapeKind: template.shapeKind,
    mounting: template.mounting,
    width: '',
    depth: '',
    diameter: '',
    height: '',
    clearances: { ...EMPTY_CLEARANCES },
    ports: [],
  }
}

/** Draft for editing an existing type. */
export function draftFromType(type: EquipmentType): TypeDraft {
  const { shape } = type
  const c = type.clearances
  return {
    id: type.id,
    name: type.name,
    tagPrefix: type.tagPrefix,
    shapeKind: shape.kind,
    mounting: type.mounting,
    width: shape.kind === 'box' ? String(shape.width) : '',
    depth: shape.kind === 'box' ? String(shape.depth) : '',
    diameter: shape.kind === 'cylinder' ? String(shape.diameter) : '',
    height: String(shape.height),
    clearances: c
      ? {
          front: c.front ? String(c.front) : '',
          back: c.back ? String(c.back) : '',
          left: c.left ? String(c.left) : '',
          right: c.right ? String(c.right) : '',
          top: c.top ? String(c.top) : '',
        }
      : { ...EMPTY_CLEARANCES },
    ports: type.ports.map((p) => ({
      id: p.id,
      name: p.name,
      systemId: p.systemId,
      x: String(p.position.x),
      y: String(p.position.y),
      z: String(p.position.z),
      direction: p.direction,
      size: p.size,
      outerDiameter: p.outerDiameter === undefined ? '' : String(p.outerDiameter),
    })),
    ...(type.model ? { model: type.model } : {}),
  }
}

export function emptyPortDraft(id: string, systemId: string): PortDraft {
  return {
    id,
    name: '',
    systemId,
    x: '',
    y: '',
    z: '',
    direction: '-y',
    size: '',
    outerDiameter: '',
  }
}

const parseInteger = (text: string): number | null =>
  /^-?\d+$/.test(text.trim()) ? Number(text.trim()) : null

const MESSAGES = {
  name: 'Vnesi ime tipa.',
  tagPrefix: `Vnesi predpono oznake (brez presledkov, največ ${MAX_TAG_PREFIX_LENGTH} znakov).`,
  dimension: 'Vnesi mero v mm (celo število, večje od 0).',
  clearance: 'Odmik mora biti celo število v mm (0 ali več) ali prazno.',
  portName: 'Vnesi ime priključka.',
  portSystem: 'Izberi sistem.',
  portCoordinate: 'Vnesi celo število v mm.',
  portDiameter: 'Premer mora biti celo število v mm, večje od 0, ali prazno.',
}

/** Field key -> Slovenian message. Port fields use `ports.<index>.<field>`. */
export type DraftErrors = Record<string, string>

export type DraftResult = { ok: true; type: EquipmentType } | { ok: false; errors: DraftErrors }

/**
 * Validates the form and builds the equipment type. Nothing is filled in for the user:
 * every dimension must be entered, clearances may stay empty (none).
 */
export function draftToType(draft: TypeDraft): DraftResult {
  const errors: DraftErrors = {}
  const name = draft.name.trim()
  if (name === '') errors.name = MESSAGES.name
  const tagPrefix = draft.tagPrefix.trim()
  if (tagPrefix === '' || /\s/.test(tagPrefix) || tagPrefix.length > MAX_TAG_PREFIX_LENGTH) {
    errors.tagPrefix = MESSAGES.tagPrefix
  }

  const dimension = (field: 'width' | 'depth' | 'diameter' | 'height'): number => {
    const value = parseInteger(draft[field])
    if (value === null || value <= 0) errors[field] = MESSAGES.dimension
    return value ?? 0
  }
  const height = dimension('height')
  const shape: EquipmentShape =
    draft.shapeKind === 'box'
      ? { kind: 'box', width: dimension('width'), depth: dimension('depth'), height }
      : { kind: 'cylinder', diameter: dimension('diameter'), height }

  const clearances = {} as Clearances
  for (const side of Object.keys(EMPTY_CLEARANCES) as ClearanceSideKey[]) {
    const text = draft.clearances[side].trim()
    const value = text === '' ? 0 : parseInteger(text)
    if (value === null || value < 0) errors[`clearances.${side}`] = MESSAGES.clearance
    clearances[side] = value ?? 0
  }

  const ports: Port[] = draft.ports.map((p, i) => {
    const coordinate = (axis: 'x' | 'y' | 'z'): number => {
      const value = parseInteger(p[axis])
      if (value === null) errors[`ports.${i}.${axis}`] = MESSAGES.portCoordinate
      return value ?? 0
    }
    if (p.name.trim() === '') errors[`ports.${i}.name`] = MESSAGES.portName
    if (p.systemId === '') errors[`ports.${i}.systemId`] = MESSAGES.portSystem
    const diameterText = p.outerDiameter.trim()
    const diameter = diameterText === '' ? undefined : parseInteger(diameterText)
    if (diameter === null || (diameter !== undefined && diameter <= 0)) {
      errors[`ports.${i}.outerDiameter`] = MESSAGES.portDiameter
    }
    return {
      id: p.id,
      name: p.name.trim(),
      systemId: p.systemId,
      position: { x: coordinate('x'), y: coordinate('y'), z: coordinate('z') },
      direction: p.direction,
      size: p.size.trim(),
      ...(typeof diameter === 'number' && diameter > 0 ? { outerDiameter: diameter } : {}),
    }
  })

  if (Object.keys(errors).length > 0) return { ok: false, errors }
  const type: EquipmentType = {
    id: draft.id,
    name,
    tagPrefix,
    shape,
    mounting: draft.mounting,
    ports,
  }
  if (Object.values(clearances).some((v) => v > 0)) type.clearances = clearances
  if (draft.model) type.model = draft.model
  return { ok: true, type }
}

/**
 * Best-effort type for the live preview: needs valid dimensions; ports and clearances
 * that are not valid yet are left out. Returns null while the dimensions are incomplete.
 */
export function previewType(draft: TypeDraft): EquipmentType | null {
  const positive = (text: string) => {
    const value = parseInteger(text)
    return value !== null && value > 0 ? value : null
  }
  const height = positive(draft.height)
  let shape: EquipmentShape | null = null
  if (draft.shapeKind === 'box') {
    const width = positive(draft.width)
    const depth = positive(draft.depth)
    if (width && depth && height) shape = { kind: 'box', width, depth, height }
  } else {
    const diameter = positive(draft.diameter)
    if (diameter && height) shape = { kind: 'cylinder', diameter, height }
  }
  if (!shape) return null

  const ports: Port[] = []
  for (const p of draft.ports) {
    const x = parseInteger(p.x)
    const y = parseInteger(p.y)
    const z = parseInteger(p.z)
    if (x === null || y === null || z === null) continue
    ports.push({
      id: p.id,
      name: p.name,
      systemId: p.systemId,
      position: { x, y, z },
      direction: p.direction,
      size: p.size,
    })
  }
  const side = (text: string) => {
    const value = parseInteger(text)
    return value !== null && value > 0 ? value : 0
  }
  const c = draft.clearances
  return {
    id: draft.id,
    name: draft.name,
    tagPrefix: draft.tagPrefix,
    shape,
    mounting: draft.mounting,
    ports,
    clearances: {
      front: side(c.front),
      back: side(c.back),
      left: side(c.left),
      right: side(c.right),
      top: side(c.top),
    },
  }
}
