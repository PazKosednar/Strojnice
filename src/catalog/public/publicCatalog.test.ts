import { describe, expect, it } from 'vitest'
import { isPublicModelPath, parseEquipmentType } from '../../core/equipmentType'
import { modelDimensions } from '../../core/modelDimensions'
import { groupByManufacturer, PUBLIC_PRODUCTS, type PublicProduct } from './index'

// Lazy glob: only the file names are needed, nothing is loaded.
const PUBLIC_FILES = Object.keys(
  import.meta.glob('../../../public/library/**/*.glb', { query: '?url' }),
)

describe('public catalogue', () => {
  it('contains Viessmann', () => {
    expect(PUBLIC_PRODUCTS.some((p) => p.manufacturer === 'Viessmann')).toBe(true)
  })

  it('has unique product ids', () => {
    const ids = PUBLIC_PRODUCTS.map((p) => p.type.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it.each(PUBLIC_PRODUCTS.map((p) => [p.type.name, p] as const))(
    '%s is a valid type with an existing model',
    (_name, product) => {
      const { type } = product
      expect(parseEquipmentType(JSON.parse(JSON.stringify(type)))).toEqual({ ok: true, type })
      if (type.model) {
        expect(isPublicModelPath(type.model.path)).toBe(true)
        expect(PUBLIC_FILES).toContain(`../../../public/${type.model.path}`)
        expect(type.model.path.endsWith(`/${type.model.fileName}`)).toBe(true)
      }
    },
  )

  it.each(PUBLIC_PRODUCTS.map((p) => [p.type.name, p] as const))(
    '%s has ports within its extents (the model, when there is one), with an outer diameter',
    (_name, { type }) => {
      const { shape } = type
      // Connection nozzles may stick out of the casing, so a model's extents count when
      // there is one (model x = local x, model z towards the viewer = local -y, model y up).
      const model = type.model
      const local =
        model && model.rotation === 0
          ? (() => {
              const cx = (model.bounds.min.x + model.bounds.max.x) / 2
              const cz = (model.bounds.min.z + model.bounds.max.z) / 2
              return {
                x: [model.bounds.min.x - cx, model.bounds.max.x - cx],
                y: [-(model.bounds.max.z - cz), -(model.bounds.min.z - cz)],
                z: [0, model.bounds.max.y - model.bounds.min.y],
              }
            })()
          : (() => {
              const [halfW, halfD] =
                shape.kind === 'box'
                  ? [shape.width / 2, shape.depth / 2]
                  : [shape.diameter / 2, shape.diameter / 2]
              return { x: [-halfW, halfW], y: [-halfD, halfD], z: [0, shape.height] }
            })()
      for (const port of type.ports) {
        for (const axis of ['x', 'y', 'z'] as const) {
          const v = port.position[axis]
          // 1 mm for the rounding of measured extents.
          expect(v, `${port.id}.${axis}`).toBeGreaterThanOrEqual(local[axis][0]! - 1)
          expect(v, `${port.id}.${axis}`).toBeLessThanOrEqual(local[axis][1]! + 1)
        }
        expect(port.outerDiameter, `${port.id}.outerDiameter`).toBeGreaterThan(0)
      }
    },
  )

  it('Viessmann Vitocal 250-A has the ports of data sheet 6246346', () => {
    const ports = (id: string) =>
      PUBLIC_PRODUCTS.find((p) => p.type.id === id)!.type.ports.map((p) => p.id)
    expect(ports('viessmann-vitocal-250-a-idu-a')).toEqual(['A', 'B', 'C', 'D', 'E', 'F'])
    expect(ports('viessmann-vitocal-250-a-odu-250-a')).toEqual(['A', 'B'])
  })

  it('Viessmann dimensions match the model extents', () => {
    for (const { type } of PUBLIC_PRODUCTS.filter((p) => p.manufacturer === 'Viessmann')) {
      if (!type.model) throw new Error(type.name)
      const size = modelDimensions(type.model.bounds, type.model.rotation)
      if (type.shape.kind === 'box') {
        expect(size).toEqual({
          width: type.shape.width,
          depth: type.shape.depth,
          height: type.shape.height,
        })
      } else {
        // Cylinder: diameter = model width (the depth includes the connection nozzles).
        expect([type.shape.diameter, type.shape.height]).toEqual([size.width, size.height])
      }
    }
  })
})

describe('groupByManufacturer', () => {
  const product = (manufacturer: string, name: string): PublicProduct => ({
    manufacturer,
    type: { ...PUBLIC_PRODUCTS[0]!.type, id: name, name },
  })

  it('groups and sorts manufacturers and products by name', () => {
    const groups = groupByManufacturer([
      product('Viessmann', 'B'),
      product('Buderus', 'X'),
      product('Viessmann', 'A'),
    ])
    expect(groups.map((g) => [g.manufacturer, g.products.map((p) => p.type.name)])).toEqual([
      ['Buderus', ['X']],
      ['Viessmann', ['A', 'B']],
    ])
  })
})

describe('Vitocal 250-A connection keys', () => {
  it('pair ODU A -> IDU C (flow) and IDU D -> ODU B (return), nothing else', () => {
    const keys = PUBLIC_PRODUCTS.flatMap(({ type }) =>
      type.ports
        .filter((p) => p.connectionKey)
        .map((p) => `${type.id}:${p.id}:${p.connectionKey}:${p.flow}`),
    )
    expect(keys.sort()).toEqual(
      [
        'viessmann-vitocal-250-a-idu-a:C:vitocal-250-a-primary-flow:in',
        'viessmann-vitocal-250-a-idu-a:D:vitocal-250-a-primary-return:out',
        'viessmann-vitocal-250-a-odu-250-a:A:vitocal-250-a-primary-flow:out',
        'viessmann-vitocal-250-a-odu-250-a:B:vitocal-250-a-primary-return:in',
      ].sort(),
    )
  })
})

describe('Viessmann Vitocell cylinders', () => {
  const type = (id: string) => PUBLIC_PRODUCTS.find((p) => p.type.id === id)!.type
  const ports = (id: string) =>
    type(id).ports.map((p) => [p.id, p.systemId, p.size, p.outerDiameter, p.direction])

  it('have the ports of the port files, without H_EL, H_E and the lower H_AB', () => {
    expect(ports('viessmann-vitocell-100-v-cvwb-300')).toEqual([
      ['H_AB', 'dhw', 'DN25 (Ø33.7)', 34, '+y'],
      ['H_EZ', 'dhw', 'DN20 (Ø26.9)', 27, '+y'],
      ['H_VWE', 'supply', 'DN32 (Ø42.4)', 42, '+y'],
      ['H_RWE', 'return', 'DN32 (Ø42.4)', 42, '+y'],
      ['H_EK', 'cold', 'DN25 (Ø33.7)', 34, '+y'],
    ])
    expect(type('viessmann-vitocell-100-e-svwa-200').ports.map((p) => p.id)).toEqual([
      'H_VWE-1078',
      'H_VWE-978',
      'H_RWE-359',
      'H_RWE-259',
    ])
    for (const id of ['viessmann-vitocell-100-w-cvwa-390', 'viessmann-vitocell-100-w-cvwa-500']) {
      const ab = type(id).ports.filter((p) => p.id.startsWith('H_AB'))
      expect(ab).toHaveLength(1)
      expect(ab[0]!.position.z).toBeGreaterThan(572)
    }
    expect(type('viessmann-vitocell-100-e-svpa-46')).toMatchObject({
      tagPrefix: 'BUF',
      mounting: 'wall',
      shape: { kind: 'box', width: 450, depth: 382, height: 925 },
    })
  })

  it('have no connection keys yet (to be confirmed)', () => {
    const vitocell = PUBLIC_PRODUCTS.filter((p) => p.type.id.includes('vitocell'))
    expect(vitocell).toHaveLength(5)
    expect(vitocell.flatMap((p) => p.type.ports).some((p) => p.connectionKey)).toBe(false)
  })
})
