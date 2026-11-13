import type { PublicProduct } from './product'

/*
 * Viessmann. Models: public/library/viessmann/ (manufacturer's .glb files).
 *
 * Dimensions are the model's extents (scripts/measure-model.mjs). Ports and service
 * clearances are not entered yet: add them from the manufacturer's installation manual
 * (ports need an outer diameter before pipes can be connected).
 */
export const VIESSMANN: readonly PublicProduct[] = [
  {
    manufacturer: 'Viessmann',
    type: {
      id: 'viessmann-vitocal-250-a-idu-a',
      name: 'Vitocal 250-A notranja enota (IDU-A)',
      tagPrefix: 'IDU',
      shape: { kind: 'box', width: 450, depth: 366, height: 932 },
      mounting: 'wall',
      ports: [],
      model: {
        path: 'library/viessmann/Vitocal-250-A_IDU-A.glb',
        fileName: 'Vitocal-250-A_IDU-A.glb',
        rotation: 0,
        bounds: { min: { x: -225, y: 0, z: -183 }, max: { x: 225, y: 932, z: 183 } },
      },
    },
  },
  {
    manufacturer: 'Viessmann',
    type: {
      id: 'viessmann-vitocal-250-a-odu-250-a',
      name: 'Vitocal 250-A zunanja enota (ODU 250-A)',
      tagPrefix: 'HP',
      shape: { kind: 'box', width: 1146, depth: 608, height: 841 },
      mounting: 'floor',
      ports: [],
      model: {
        path: 'library/viessmann/Vitocal-250-A_ODU-250-A.glb',
        fileName: 'Vitocal-250-A_ODU-250-A.glb',
        rotation: 0,
        bounds: { min: { x: -573, y: 0, z: -304 }, max: { x: 573, y: 841, z: 304 } },
      },
    },
  },
]
