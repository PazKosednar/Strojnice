import type { Point } from '../core/scene'

/**
 * 2D view transform: screen = (x * scale + tx, -y * scale + ty).
 * `scale` is pixels per millimetre; plan y points up, screen y points down.
 */
export interface View {
  scale: number
  tx: number
  ty: number
}

export const MIN_SCALE = 0.005
export const MAX_SCALE = 2

export function worldToScreen(view: View, p: Point): Point {
  return { x: p.x * view.scale + view.tx, y: -p.y * view.scale + view.ty }
}

export function screenToWorld(view: View, p: Point): Point {
  return { x: (p.x - view.tx) / view.scale, y: -(p.y - view.ty) / view.scale }
}

/** Zooms by `factor` keeping the world point under `anchor` (screen px) fixed. */
export function zoomAt(view: View, factor: number, anchor: Point): View {
  const scale = Math.min(Math.max(view.scale * factor, MIN_SCALE), MAX_SCALE)
  const world = screenToWorld(view, anchor)
  return { scale, tx: anchor.x - world.x * scale, ty: anchor.y + world.y * scale }
}

export function panBy(view: View, dx: number, dy: number): View {
  return { ...view, tx: view.tx + dx, ty: view.ty + dy }
}

export interface Rect {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

/**
 * View that fits `bounds` (mm) into a `width` × `height` px viewport with `padding` px.
 * Without bounds, shows about 6 m around the origin.
 */
export function fitView(bounds: Rect | null, width: number, height: number, padding = 40): View {
  const b = bounds ?? { minX: -3000, minY: -3000, maxX: 3000, maxY: 3000 }
  const w = Math.max(b.maxX - b.minX, 1000)
  const h = Math.max(b.maxY - b.minY, 1000)
  const scale = Math.min(
    Math.max(Math.min((width - 2 * padding) / w, (height - 2 * padding) / h), MIN_SCALE),
    MAX_SCALE,
  )
  const cx = (b.minX + b.maxX) / 2
  const cy = (b.minY + b.maxY) / 2
  return { scale, tx: width / 2 - cx * scale, ty: height / 2 + cy * scale }
}

/** Largest "nice" length (1, 2, 5 × 10^n mm) whose on-screen size does not exceed `maxPx`. */
export function niceLength(scale: number, maxPx: number): number {
  const raw = maxPx / scale
  const magnitude = 10 ** Math.floor(Math.log10(raw))
  for (const m of [5, 2, 1]) {
    if (m * magnitude <= raw) return m * magnitude
  }
  return magnitude
}

/** Visible grid spacing: the snap grid, coarsened (×2, ×5, ×10 …) so lines are ≥ `minPx` apart. */
export function displayGridStep(gridSize: number, scale: number, minPx = 8): number {
  let step = gridSize
  const factors = [2, 2.5, 2]
  let i = 0
  while (step * scale < minPx) {
    step *= factors[i % factors.length]!
    i++
  }
  return step
}
