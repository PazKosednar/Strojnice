import { useGLTF } from '@react-three/drei'
import { Component, Suspense, use, useMemo, type ReactNode } from 'react'
import type { Vec3 } from '../core/sceneToBoxes'
import { modelObjectUrl } from '../lib/modelsApi'

interface Props {
  path: string
  /** Bottom centre of the equipment (m). */
  base: Vec3
  /** Equipment rotation (radians). */
  equipmentRotationY: number
  /** Model rotation within the equipment (radians). */
  modelRotationY: number
  /** Moves the model's bottom centre to the origin (m). */
  offset: Vec3
}

function LoadedModel({
  url,
  equipmentRotationY,
  modelRotationY,
  offset,
  base,
}: Omit<Props, 'path'> & { url: string }) {
  const gltf = useGLTF(url)
  // Every placed item needs its own copy of the scene graph.
  const scene = useMemo(() => gltf.scene.clone(true), [gltf.scene])
  return (
    <group position={base} rotation-y={equipmentRotationY}>
      <group rotation-y={modelRotationY}>
        <primitive object={scene} position={offset} />
      </group>
    </group>
  )
}

function ModelFromStorage(props: Props) {
  // The bucket is private: download with the user's session, then load from memory.
  const url = use(modelObjectUrl(props.path))
  return <LoadedModel url={url} {...props} />
}

interface BoundaryProps {
  fallback: ReactNode
  children: ReactNode
}

/** Shows the fallback (the plain box) when a model cannot be downloaded or parsed. */
class ModelErrorBoundary extends Component<BoundaryProps, { failed: boolean }> {
  override state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  override render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

/**
 * Manufacturer model of placed equipment. While it loads, and if it fails, the plain body
 * (`fallback`) is drawn instead, so the 3D view never stays empty.
 */
export function ModelMesh({ fallback, ...props }: Props & { fallback: ReactNode }) {
  return (
    <ModelErrorBoundary fallback={fallback}>
      <Suspense fallback={fallback}>
        <ModelFromStorage {...props} />
      </Suspense>
    </ModelErrorBoundary>
  )
}
