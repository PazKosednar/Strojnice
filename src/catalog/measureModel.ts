import type { EquipmentModel } from '../core/scene'

/**
 * Reads a glTF binary in the browser and returns its extents in millimetres (model axes,
 * rounded outwards). three.js is loaded only when a file is chosen.
 */
export async function measureGlb(file: File): Promise<EquipmentModel['bounds']> {
  const [{ GLTFLoader }, { Box3 }] = await Promise.all([
    import('three/examples/jsm/loaders/GLTFLoader.js'),
    import('three'),
  ])
  const buffer = await file.arrayBuffer()
  const gltf = await new GLTFLoader().parseAsync(buffer, '')
  const box = new Box3().setFromObject(gltf.scene)
  if (box.isEmpty()) throw new Error('Model nima geometrije.')
  const mm = (v: number, round: (x: number) => number) => round(v * 1000) + 0
  return {
    min: {
      x: mm(box.min.x, Math.floor),
      y: mm(box.min.y, Math.floor),
      z: mm(box.min.z, Math.floor),
    },
    max: { x: mm(box.max.x, Math.ceil), y: mm(box.max.y, Math.ceil), z: mm(box.max.z, Math.ceil) },
  }
}
