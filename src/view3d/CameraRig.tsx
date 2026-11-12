import { useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import type { Vector3 } from 'three'
import { boxesBounds, type Box3d } from '../core/sceneToBoxes'

/** The part of drei's OrbitControls used here. */
interface Controls {
  target: Vector3
  update: () => void
}

interface Props {
  boxes: readonly Box3d[]
  /** Incremented by the "reset view" button. */
  resetToken: number
}

/**
 * Frames the camera on the scene: on mount, when the first walls appear and on reset.
 * It does not follow every edit, so the user's orbit position is kept while drawing.
 */
export function CameraRig({ boxes, resetToken }: Props) {
  const camera = useThree((s) => s.camera)
  const controls = useThree((s) => s.controls) as unknown as Controls | null
  const invalidate = useThree((s) => s.invalidate)
  const hasBoxes = boxes.length > 0
  const latestBoxes = useRef(boxes)

  useEffect(() => {
    latestBoxes.current = boxes
  }, [boxes])

  useEffect(() => {
    if (!controls) return
    const bounds = boxesBounds(latestBoxes.current)
    const [cx, cy, cz] = bounds?.center ?? [0, 0, 0]
    const distance = Math.max((bounds?.radius ?? 3) * 2.6, 3)
    camera.position.set(cx + distance * 0.6, cy + distance * 0.7, cz + distance * 0.8)
    controls.target.set(cx, cy, cz)
    controls.update()
    invalidate()
  }, [camera, controls, invalidate, hasBoxes, resetToken])

  return null
}
