import type { PublicProduct } from './product'

/*
 * Viessmann. Models: public/library/viessmann/ (manufacturer's .glb files).
 *
 * Dimensions are the model's extents (scripts/measure-model.mjs). Service clearances are
 * not entered yet: add them from the manufacturer's installation manual.
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
      // Ports: Viessmann technical data sheet 6246346 DE (9/2025), dimensioned drawing p. 22
      // (IDU-A); depth positions from CAD model Z026392. Valid for connection without the
      // mounting aid (Montagehilfe).
      ports: [
        {
          id: 'A',
          name: 'A – dvižni vod ogrevalni/hladilni krog 1',
          systemId: 'supply',
          position: { x: -165, y: 115, z: 1 },
          direction: '-z',
          size: 'Cu 28 x 1,0',
          outerDiameter: 28,
        },
        {
          id: 'B',
          name: 'B – dvižni vod hranilnik STV (ogrevalna stran)',
          systemId: 'supply',
          position: { x: -110, y: 40, z: 1 },
          direction: '-z',
          size: 'Cu 22 x 1,0',
          outerDiameter: 22,
        },
        {
          id: 'C',
          name: 'C – ogrevalna voda iz zunanje enote',
          systemId: 'supply',
          position: { x: -55, y: 115, z: 1 },
          direction: '-z',
          size: 'Cu 28 x 1,0',
          outerDiameter: 28,
        },
        {
          id: 'D',
          name: 'D – ogrevalna voda v zunanjo enoto',
          systemId: 'return',
          position: { x: 55, y: 115, z: 1 },
          direction: '-z',
          size: 'Cu 28 x 1,0',
          outerDiameter: 28,
        },
        {
          id: 'E',
          name: 'E – povratek hranilnik STV (ogrevalna stran)',
          systemId: 'return',
          position: { x: 110, y: 40, z: 1 },
          direction: '-z',
          size: 'Cu 22 x 1,0',
          outerDiameter: 22,
        },
        {
          id: 'F',
          name: 'F – povratek ogrevalni/hladilni krog 1',
          systemId: 'return',
          position: { x: 165, y: 115, z: 1 },
          direction: '-z',
          size: 'Cu 28 x 1,0',
          outerDiameter: 28,
        },
      ],
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
      // Ports: Viessmann technical data sheet 6246346 DE (9/2025), dimensioned drawing p. 25
      // (ODU 04–08); depth positions from CAD model Z026392. Valid for connection without the
      // mounting aid (Montagehilfe) and for ODU sizes 04–08 only.
      ports: [
        {
          id: 'A',
          name: 'A – ogrevalna voda v notranjo enoto',
          systemId: 'supply',
          position: { x: 513, y: 229, z: 67 },
          direction: '-z',
          size: 'Cu 28 x 1,0',
          outerDiameter: 28,
        },
        {
          id: 'B',
          name: 'B – ogrevalna voda iz notranje enote',
          systemId: 'return',
          position: { x: 513, y: 154, z: 67 },
          direction: '-z',
          size: 'Cu 28 x 1,0',
          outerDiameter: 28,
        },
      ],
      model: {
        path: 'library/viessmann/Vitocal-250-A_ODU-250-A.glb',
        fileName: 'Vitocal-250-A_ODU-250-A.glb',
        rotation: 0,
        bounds: { min: { x: -573, y: 0, z: -304 }, max: { x: 573, y: 841, z: 304 } },
      },
    },
  },
]
