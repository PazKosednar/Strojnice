import type { PublicProduct } from './product'

/*
 * Viessmann. Models: public/library/viessmann/ (manufacturer's .glb files).
 *
 * Dimensions are the model's extents (scripts/measure-model.mjs). Service clearances are
 * not entered yet: add them from the manufacturer's installation manual.
 *
 * Connection keys pair the primary circuit (given by the user): ODU A (out) -> IDU C (in)
 * 'vitocal-250-a-primary-flow', IDU D (out) -> ODU B (in) 'vitocal-250-a-primary-return'.
 * The other IDU ports get no key: the user sets keys in their own catalogue.
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
          connectionKey: 'vitocal-250-a-primary-flow',
          flow: 'in',
        },
        {
          id: 'D',
          name: 'D – ogrevalna voda v zunanjo enoto',
          systemId: 'return',
          position: { x: 55, y: 115, z: 1 },
          direction: '-z',
          size: 'Cu 28 x 1,0',
          outerDiameter: 28,
          connectionKey: 'vitocal-250-a-primary-return',
          flow: 'out',
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
          connectionKey: 'vitocal-250-a-primary-flow',
          flow: 'out',
        },
        {
          id: 'B',
          name: 'B – ogrevalna voda iz notranje enote',
          systemId: 'return',
          position: { x: 513, y: 154, z: 67 },
          direction: '-z',
          size: 'Cu 28 x 1,0',
          outerDiameter: 28,
          connectionKey: 'vitocal-250-a-primary-return',
          flow: 'in',
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
  {
    manufacturer: 'Viessmann',
    type: {
      id: 'viessmann-vitocell-100-v-cvwb-300',
      name: 'Vitocell 100-V CVWB 300 l',
      tagPrefix: 'CYL',
      shape: { kind: 'cylinder', diameter: 682, height: 1688 },
      mounting: 'floor',
      // Ports from files/3dmodels/Vitocell-100-V-CVWB-300L.ports.json (positions and directions as given).
      // Systems are a proposal: pomen nepotrjen (meaning of the labels not confirmed).
      ports: [
        {
          id: 'H_AB',
          name: 'H_AB – topla voda',
          systemId: 'dhw',
          position: { x: 0, y: 355, z: 1607 },
          direction: '+y',
          size: 'DN25 (Ø33.7)',
          outerDiameter: 34,
        },
        {
          id: 'H_EZ',
          name: 'H_EZ – cirkulacija',
          systemId: 'dhw',
          position: { x: 0, y: 355, z: 1143 },
          direction: '+y',
          size: 'DN20 (Ø26.9)',
          outerDiameter: 27,
        },
        {
          id: 'H_VWE',
          name: 'H_VWE – dvižni vod ogrevalne vode',
          systemId: 'supply',
          position: { x: 0, y: 355, z: 974 },
          direction: '+y',
          size: 'DN32 (Ø42.4)',
          outerDiameter: 42,
        },
        {
          id: 'H_RWE',
          name: 'H_RWE – povratek ogrevalne vode',
          systemId: 'return',
          position: { x: 0, y: 355, z: 266 },
          direction: '+y',
          size: 'DN32 (Ø42.4)',
          outerDiameter: 42,
        },
        {
          id: 'H_EK',
          name: 'H_EK – hladna voda',
          systemId: 'cold',
          position: { x: 0, y: 355, z: 83 },
          direction: '+y',
          size: 'DN25 (Ø33.7)',
          outerDiameter: 34,
        },
      ],
      model: {
        path: 'library/viessmann/Vitocell-100-V-CVWB-300L.glb',
        fileName: 'Vitocell-100-V-CVWB-300L.glb',
        rotation: 0,
        bounds: {
          min: { x: -341, y: 0, z: -355 },
          max: { x: 341, y: 1688, z: 359 },
        },
      },
    },
  },
  {
    manufacturer: 'Viessmann',
    type: {
      id: 'viessmann-vitocell-100-e-svwa-200',
      name: 'Vitocell 100-E SVWA 200 l',
      tagPrefix: 'BUF',
      shape: { kind: 'cylinder', diameter: 588, height: 1333 },
      mounting: 'floor',
      // Ports from files/3dmodels/Vitocell-100-E-SVWA-200L.ports.json (positions and directions as given).
      // Systems are a proposal: pomen nepotrjen (meaning of the labels not confirmed).
      ports: [
        {
          id: 'H_VWE-1078',
          name: 'H_VWE – dvižni vod ogrevalne vode (1078 mm)',
          systemId: 'supply',
          position: { x: 0, y: 317, z: 1078 },
          direction: '+y',
          size: 'DN32 (Ø33.7)',
          outerDiameter: 34,
        },
        {
          id: 'H_VWE-978',
          name: 'H_VWE – dvižni vod ogrevalne vode (978 mm)',
          systemId: 'supply',
          position: { x: 0, y: 317, z: 978 },
          direction: '+y',
          size: 'DN32 (Ø33.7)',
          outerDiameter: 34,
        },
        {
          id: 'H_RWE-359',
          name: 'H_RWE – povratek ogrevalne vode (359 mm)',
          systemId: 'return',
          position: { x: 0, y: 317, z: 359 },
          direction: '+y',
          size: 'DN32 (Ø33.7)',
          outerDiameter: 34,
        },
        {
          id: 'H_RWE-259',
          name: 'H_RWE – povratek ogrevalne vode (259 mm)',
          systemId: 'return',
          position: { x: 0, y: 317, z: 259 },
          direction: '+y',
          size: 'DN32 (Ø33.7)',
          outerDiameter: 34,
        },
      ],
      model: {
        path: 'library/viessmann/Vitocell-100-E-SVWA-200L.glb',
        fileName: 'Vitocell-100-E-SVWA-200L.glb',
        rotation: 0,
        bounds: {
          min: { x: -294, y: 0, z: -318 },
          max: { x: 294, y: 1333, z: 322 },
        },
      },
    },
  },
  {
    manufacturer: 'Viessmann',
    type: {
      id: 'viessmann-vitocell-100-e-svpa-46',
      name: 'Vitocell 100-E SVPA 46 l',
      tagPrefix: 'BUF',
      shape: { kind: 'box', width: 450, depth: 382, height: 925 },
      mounting: 'wall',
      // Ports from files/3dmodels/Vitocell-100-E-SVPA-46L.ports.json (positions and directions as given).
      // Systems are a proposal: pomen nepotrjen (meaning of the labels not confirmed).
      ports: [
        {
          id: 'H_RWE',
          name: 'H_RWE – povratek ogrevalne vode',
          systemId: 'return',
          position: { x: -70, y: 0, z: 0 },
          direction: '-z',
          size: 'DN32 (Ø42.4)',
          outerDiameter: 42,
        },
        {
          id: 'H_VWE',
          name: 'H_VWE – dvižni vod ogrevalne vode',
          systemId: 'supply',
          position: { x: 70, y: 0, z: 0 },
          direction: '-z',
          size: 'DN32 (Ø42.4)',
          outerDiameter: 42,
        },
      ],
      model: {
        path: 'library/viessmann/Vitocell-100-E-SVPA-46L.glb',
        fileName: 'Vitocell-100-E-SVPA-46L.glb',
        rotation: 0,
        bounds: {
          min: { x: -225, y: 0, z: -182 },
          max: { x: 225, y: 925, z: 200 },
        },
      },
    },
  },
  {
    manufacturer: 'Viessmann',
    type: {
      id: 'viessmann-vitocell-100-w-cvwa-390',
      name: 'Vitocell 100-W CVWA 390 l',
      tagPrefix: 'CYL',
      shape: { kind: 'cylinder', diameter: 862, height: 1624 },
      mounting: 'floor',
      // Ports from files/3dmodels/Vitocell-100-W-CVWA-390L.ports.json (positions and directions as given).
      // Systems are a proposal: pomen nepotrjen (meaning of the labels not confirmed).
      ports: [
        {
          id: 'H_AB',
          name: 'H_AB – topla voda',
          systemId: 'dhw',
          position: { x: 0, y: 455, z: 1439 },
          direction: '+y',
          size: 'DN32 (Ø42.4)',
          outerDiameter: 42,
        },
        {
          id: 'H_EZ',
          name: 'H_EZ – cirkulacija',
          systemId: 'dhw',
          position: { x: 0, y: 455, z: 1070 },
          direction: '+y',
          size: 'DN20 (Ø26.9)',
          outerDiameter: 27,
        },
        {
          id: 'H_VWE',
          name: 'H_VWE – dvižni vod ogrevalne vode',
          systemId: 'supply',
          position: { x: 0, y: 455, z: 950 },
          direction: '+y',
          size: 'DN32 (Ø42.4)',
          outerDiameter: 42,
        },
        {
          id: 'H_RWE',
          name: 'H_RWE – povratek ogrevalne vode',
          systemId: 'return',
          position: { x: 0, y: 455, z: 330 },
          direction: '+y',
          size: 'DN32 (Ø42.4)',
          outerDiameter: 42,
        },
        {
          id: 'H_EK',
          name: 'H_EK – hladna voda',
          systemId: 'cold',
          position: { x: 0, y: 455, z: 88 },
          direction: '+y',
          size: 'DN32 (Ø42.4)',
          outerDiameter: 42,
        },
      ],
      model: {
        path: 'library/viessmann/Vitocell-100-W-CVWA-390L.glb',
        fileName: 'Vitocell-100-W-CVWA-390L.glb',
        rotation: 0,
        bounds: {
          min: { x: -431, y: 0, z: -456 },
          max: { x: 431, y: 1624, z: 468 },
        },
      },
    },
  },
  {
    manufacturer: 'Viessmann',
    type: {
      id: 'viessmann-vitocell-100-w-cvwa-500',
      name: 'Vitocell 100-W CVWA 500 l',
      tagPrefix: 'CYL',
      shape: { kind: 'cylinder', diameter: 862, height: 1948 },
      mounting: 'floor',
      // Ports from files/3dmodels/Vitocell-100-W-CVWA-500L.ports.json (positions and directions as given).
      // Systems are a proposal: pomen nepotrjen (meaning of the labels not confirmed).
      ports: [
        {
          id: 'H_AB',
          name: 'H_AB – topla voda',
          systemId: 'dhw',
          position: { x: 0, y: 455, z: 1765 },
          direction: '+y',
          size: 'DN32 (Ø42.4)',
          outerDiameter: 42,
        },
        {
          id: 'H_EZ',
          name: 'H_EZ – cirkulacija',
          systemId: 'dhw',
          position: { x: 0, y: 455, z: 1370 },
          direction: '+y',
          size: 'DN20 (Ø26.9)',
          outerDiameter: 27,
        },
        {
          id: 'H_VWE',
          name: 'H_VWE – dvižni vod ogrevalne vode',
          systemId: 'supply',
          position: { x: 0, y: 455, z: 1250 },
          direction: '+y',
          size: 'DN32 (Ø42.4)',
          outerDiameter: 42,
        },
        {
          id: 'H_RWE',
          name: 'H_RWE – povratek ogrevalne vode',
          systemId: 'return',
          position: { x: 0, y: 455, z: 330 },
          direction: '+y',
          size: 'DN32 (Ø42.4)',
          outerDiameter: 42,
        },
        {
          id: 'H_EK',
          name: 'H_EK – hladna voda',
          systemId: 'cold',
          position: { x: 0, y: 455, z: 88 },
          direction: '+y',
          size: 'DN32 (Ø42.4)',
          outerDiameter: 42,
        },
      ],
      model: {
        path: 'library/viessmann/Vitocell-100-W-CVWA-500L.glb',
        fileName: 'Vitocell-100-W-CVWA-500L.glb',
        rotation: 0,
        bounds: {
          min: { x: -431, y: 0, z: -456 },
          max: { x: 431, y: 1948, z: 468 },
        },
      },
    },
  },
]
