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
    '%s has ports within its extents, with an outer diameter',
    (_name, { type }) => {
      const { shape } = type
      const [halfW, halfD] =
        shape.kind === 'box'
          ? [shape.width / 2, shape.depth / 2]
          : [shape.diameter / 2, shape.diameter / 2]
      for (const port of type.ports) {
        const { x, y, z } = port.position
        expect(Math.abs(x), `${port.id}.x`).toBeLessThanOrEqual(halfW)
        expect(Math.abs(y), `${port.id}.y`).toBeLessThanOrEqual(halfD)
        expect(z, `${port.id}.z`).toBeGreaterThanOrEqual(0)
        expect(z, `${port.id}.z`).toBeLessThanOrEqual(shape.height)
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
      if (type.shape.kind !== 'box' || !type.model) throw new Error(type.name)
      const size = modelDimensions(type.model.bounds, type.model.rotation)
      expect(size).toEqual({
        width: type.shape.width,
        depth: type.shape.depth,
        height: type.shape.height,
      })
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
