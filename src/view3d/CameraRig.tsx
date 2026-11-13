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
    // Distance at which the bounding sphere fits the field of view. The sphere is much larger
    // than the room seen from this angle, so the room is brought closer (0.8).
    // Use the narrower of the vertical and horizontal field of view.
    const vFov = 'fov' in camera ? (camera.fov * Math.PI) / 180 : Math.PI / 4
    const aspect = 'aspect' in camera ? camera.aspect : 1
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect)
    const fov = Math.min(vFov, hFov)
    const radius = Math.max(bounds?.radius ?? 3, 1)
    const distance = (radius / Math.sin(fov / 2)) * 0.8
    // Look from the front-right and above (direction normalised).
    const dir = [0.55, 0.6, 0.58]
    const len = Math.hypot(dir[0]!, dir[1]!, dir[2]!)
    camera.position.set(
      cx + (dir[0]! / len) * distance,
      cy + (dir[1]! / len) * distance,
      cz + (dir[2]! / len) * distance,
    )
    controls.target.set(cx, cy, cz)
    controls.update()
    invalidate()
  }, [camera, controls, invalidate, hasBoxes, resetToken])

  return null
}
