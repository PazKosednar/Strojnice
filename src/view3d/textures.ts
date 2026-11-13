import { BoxGeometry, CanvasTexture, RepeatWrapping, SRGBColorSpace, type Texture } from 'three'

/**
 * Drawn (procedural) textures for the illustrated 3D look: brick outer leaf, light block
 * inner leaf, floor tiles. UVs of the geometries below are in metres, so `repeat` is
 * 1 / (size of one texture tile in metres) and the pattern keeps its real size everywhere.
 * Sizes are for the picture only (typical masonry modules), not data of the project.
 */

function canvasTexture(
  width: number,
  height: number,
  tileMetres: [number, number],
  draw: (ctx: CanvasRenderingContext2D) => void,
): Texture {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (ctx) draw(ctx)
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping
  texture.repeat.set(1 / tileMetres[0], 1 / tileMetres[1])
  texture.anisotropy = 8
  return texture
}

/** Small deterministic variation so bricks do not all look the same. */
function shade(seed: number, base: [number, number, number], spread: number): string {
  const n = Math.sin(seed * 12.9898) * 43758.5453
  const f = (n - Math.floor(n) - 0.5) * spread
  const [r, g, b] = base.map((c) => Math.max(0, Math.min(255, Math.round(c * (1 + f)))))
  return `rgb(${r}, ${g}, ${b})`
}

/** Running-bond bricks: one tile = 2 bricks wide (450 mm) × 4 courses high (300 mm). */
function brick(): Texture {
  const W = 512
  const H = 342
  return canvasTexture(W, H, [0.45, 0.3], (ctx) => {
    ctx.fillStyle = '#e9dccb'
    ctx.fillRect(0, 0, W, H)
    const bw = W / 2
    const bh = H / 4
    const joint = 7
    for (let row = 0; row < 4; row++) {
      const offset = row % 2 === 0 ? 0 : bw / 2
      for (let col = -1; col < 3; col++) {
        const x = col * bw + offset
        ctx.fillStyle = shade(row * 7 + col + 3, [196, 112, 78], 0.22)
        ctx.fillRect(x + joint / 2, row * bh + joint / 2, bw - joint, bh - joint)
      }
    }
  })
}

/** Light concrete blocks: one tile = 2 blocks wide (900 mm) × 2 courses (450 mm). */
function block(): Texture {
  const W = 512
  const H = 256
  return canvasTexture(W, H, [0.9, 0.45], (ctx) => {
    ctx.fillStyle = '#c9c9c4'
    ctx.fillRect(0, 0, W, H)
    const bw = W / 2
    const bh = H / 2
    const joint = 4
    for (let row = 0; row < 2; row++) {
      const offset = row === 0 ? 0 : bw / 2
      for (let col = -1; col < 3; col++) {
        const x = col * bw + offset
        ctx.fillStyle = shade(row * 5 + col + 11, [228, 228, 224], 0.04)
        ctx.fillRect(x + joint / 2, row * bh + joint / 2, bw - joint, bh - joint)
      }
    }
  })
}

/** Floor tiles 600 × 600 mm with thin joints. */
function tiles(): Texture {
  const W = 256
  return canvasTexture(W, W, [0.6, 0.6], (ctx) => {
    ctx.fillStyle = '#d4d6d3'
    ctx.fillRect(0, 0, W, W)
    ctx.fillStyle = '#dcdedb'
    ctx.fillRect(2, 2, W - 4, W - 4)
  })
}

let cache: { brick: Texture; block: Texture; tiles: Texture } | null = null

/** The shared textures (created once, on first use in the browser). */
export function illustrationTextures() {
  cache ??= { brick: brick(), block: block(), tiles: tiles() }
  return cache
}

/**
 * Box geometry whose UVs are in metres on every face (width along x, height along y,
 * depth along z), for textures with a real-size repeat.
 */
export function metricBox(width: number, height: number, depth: number): BoxGeometry {
  const geometry = new BoxGeometry(width, height, depth)
  const uv = geometry.attributes.uv!
  // Faces in order +x, -x, +y, -y, +z, -z; four vertices each.
  const scale: [number, number][] = [
    [depth, height],
    [depth, height],
    [width, depth],
    [width, depth],
    [width, height],
    [width, height],
  ]
  for (let face = 0; face < 6; face++) {
    const [su, sv] = scale[face]!
    for (let v = 0; v < 4; v++) {
      const i = face * 4 + v
      uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv)
    }
  }
  uv.needsUpdate = true
  return geometry
}
