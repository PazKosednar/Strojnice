import { useEffect, useMemo } from 'react'
import { CanvasTexture, SRGBColorSpace } from 'three'
import type { Vec3 } from '../core/sceneToBoxes'

/** Label height in metres; the width follows the text. */
const LABEL_HEIGHT = 0.16
const CANVAS_HEIGHT = 72
const FONT = '600 46px system-ui, "Segoe UI", sans-serif'

function drawLabel(text: string): { canvas: HTMLCanvasElement; aspect: number } {
  const canvas = document.createElement('canvas')
  const measure = canvas.getContext('2d')
  if (measure) measure.font = FONT
  const width = Math.ceil(measure?.measureText(text).width ?? text.length * 26) + 36
  canvas.width = width
  canvas.height = CANVAS_HEIGHT
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.94)'
    ctx.strokeStyle = '#334155'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.roundRect(2, 2, width - 4, CANVAS_HEIGHT - 4, 10)
    ctx.fill()
    ctx.stroke()
    ctx.font = FONT
    ctx.fillStyle = '#111827'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, width / 2, CANVAS_HEIGHT / 2 + 2)
  }
  return { canvas, aspect: width / CANVAS_HEIGHT }
}

interface Props {
  text: string
  position: Vec3
}

/** Equipment tag as a camera-facing label, always drawn on top. */
export function TagLabel({ text, position }: Props) {
  const { texture, aspect } = useMemo(() => {
    const { canvas, aspect } = drawLabel(text)
    const texture = new CanvasTexture(canvas)
    texture.colorSpace = SRGBColorSpace
    return { texture, aspect }
  }, [text])

  // The texture is created here, not by fiber, so it must be disposed here.
  useEffect(() => () => texture.dispose(), [texture])

  return (
    <sprite position={position} scale={[LABEL_HEIGHT * aspect, LABEL_HEIGHT, 1]} renderOrder={10}>
      <spriteMaterial map={texture} depthTest={false} transparent toneMapped={false} />
    </sprite>
  )
}
