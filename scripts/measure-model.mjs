// Prints the bounds (mm, model axes) of .glb files, for entries in the public catalogue:
//   node scripts/measure-model.mjs public/library/viessmann/Vitocal-250-A_IDU-A.glb
// Same measurement as the type form in the browser (src/catalog/measureModel.ts).
import { readFileSync } from 'node:fs'
import { Box3 } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

// GLTFLoader may touch these while parsing textures; geometry needs neither.
globalThis.self ??= globalThis
globalThis.createImageBitmap ??= async () => ({ width: 1, height: 1, close() {} })

const files = process.argv.slice(2)
if (files.length === 0) {
  console.error('Usage: node scripts/measure-model.mjs <file.glb> [...]')
  process.exit(1)
}

for (const file of files) {
  const bytes = readFileSync(file)
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
  const gltf = await new GLTFLoader().parseAsync(buffer, '')
  const box = new Box3().setFromObject(gltf.scene)
  const mm = (v, round) => round(v * 1000) + 0
  const bounds = {
    min: {
      x: mm(box.min.x, Math.floor),
      y: mm(box.min.y, Math.floor),
      z: mm(box.min.z, Math.floor),
    },
    max: { x: mm(box.max.x, Math.ceil), y: mm(box.max.y, Math.ceil), z: mm(box.max.z, Math.ceil) },
  }
  const size = {
    width: bounds.max.x - bounds.min.x,
    depth: bounds.max.z - bounds.min.z,
    height: bounds.max.y - bounds.min.y,
  }
  console.log(file)
  console.log(`  bounds: ${JSON.stringify(bounds)}`)
  console.log(`  size (w × d × h, rotation 0): ${size.width} × ${size.depth} × ${size.height} mm`)
}
