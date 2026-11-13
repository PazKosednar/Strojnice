import { ContactShadows } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { PMREMGenerator } from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import type { Box3d } from '../core/sceneToBoxes'
import { illustrationTextures, metricBox } from './textures'

/** How far the floor slab reaches beyond the walls (m), like a cut-out illustration. */
const FLOOR_MARGIN = 1.5

/**
 * Soft studio light for the illustrated look: a built-in room environment (no download) for
 * gentle reflections on copper and white casings, plus a key light.
 */
export function StudioLights() {
  const get = useThree((s) => s.get)
  useEffect(() => {
    const { gl, scene } = get()
    const pmrem = new PMREMGenerator(gl)
    const environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    scene.environment = environment
    scene.environmentIntensity = 0.55
    return () => {
      scene.environment = null
      environment.dispose()
      pmrem.dispose()
    }
  }, [get])
  return (
    <>
      <hemisphereLight args={['#ffffff', '#b9bcbf', 0.9]} />
      <directionalLight position={[5, 10, 7]} intensity={1.3} />
      <directionalLight position={[-6, 5, -4]} intensity={0.35} />
    </>
  )
}

/** Tiled floor slab reaching beyond the room, with soft contact shadows on it. */
export function Floor({ floor }: { floor: Box3d | undefined }) {
  const width = floor ? floor.size[0] + 2 * FLOOR_MARGIN : 0
  const depth = floor ? floor.size[2] + 2 * FLOOR_MARGIN : 0
  const thick = floor ? floor.size[1] : 0
  const size = floor ? ([width, thick, depth] as const) : null
  const geometry = useMemo(
    () => (width > 0 ? metricBox(width, thick, depth) : null),
    [width, thick, depth],
  )
  useEffect(() => () => geometry?.dispose(), [geometry])
  if (!floor || !size || !geometry) return null
  const [cx, , cz] = floor.center
  return (
    <>
      <mesh geometry={geometry} position={floor.center}>
        <meshStandardMaterial map={illustrationTextures().tiles} roughness={0.9} />
      </mesh>
      <ContactShadows
        position={[cx, 0.002, cz]}
        scale={[size[0], size[2]]}
        resolution={1024}
        far={2.5}
        blur={2.4}
        opacity={0.42}
        color="#1f2937"
      />
    </>
  )
}
