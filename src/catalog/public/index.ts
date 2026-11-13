import type { PublicProduct } from './product'
import { VIESSMANN } from './viessmann'

export type { PublicProduct } from './product'

/**
 * Public catalogue: products of all manufacturers, the same for every user. To add a
 * manufacturer, create its file next to this one and list it here (docs/javni-katalog.md).
 */
export const PUBLIC_PRODUCTS: readonly PublicProduct[] = [...VIESSMANN]

/** Products grouped by manufacturer, manufacturers and products sorted by name. */
export function groupByManufacturer(
  products: readonly PublicProduct[],
): { manufacturer: string; products: PublicProduct[] }[] {
  const groups = new Map<string, PublicProduct[]>()
  for (const product of products) {
    const list = groups.get(product.manufacturer) ?? []
    list.push(product)
    groups.set(product.manufacturer, list)
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b, 'sl'))
    .map(([manufacturer, list]) => ({
      manufacturer,
      products: [...list].sort((a, b) => a.type.name.localeCompare(b.type.name, 'sl')),
    }))
}
