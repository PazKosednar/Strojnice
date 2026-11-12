import { Edges, OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { useMemo, useState } from 'react'
import { equipmentTo3d } from '../core/equipmentTo3d'
import { sceneToBoxes } from '../core/sceneToBoxes'
import { equipmentWithConflicts, sceneWarnings } from '../core/sceneWarnings'
import { selectScene, useEditorStore } from '../stores/editorStore'
import { CameraRig } from './CameraRig'
import { Equipment3D } from './Equipment3D'

const COLORS = {
  wall: '#d9d6cf',
  wallSelected: '#9cc0ff',
  floor: '#b8bcc2',
  edges: '#6b7280',
}

/**
 * 3D view of the scene in the editor store. Pure projection: it derives primitives from the
 * scene on every change and holds no geometry state of its own. Editing is 2D-only.
 */
export default function View3D() {
  const scene = useEditorStore(selectScene)
  const selection = useEditorStore((s) => s.selection)
  const boxes = useMemo(() => sceneToBoxes(scene), [scene])
  const equipment = useMemo(() => equipmentTo3d(scene), [scene])
  const conflicts = useMemo(() => equipmentWithConflicts(sceneWarnings(scene)), [scene])
  const [resetToken, setResetToken] = useState(0)

  return (
    <div className="view3d">
      <Canvas
        frameloop="demand"
        dpr={[1, 2]}
        camera={{ fov: 45, near: 0.05, far: 500, position: [6, 6, 8] }}
        aria-label="3D pogled"
      >
        <color attach="background" args={['#eef1f5']} />
        <hemisphereLight args={['#ffffff', '#8d8d8d', 1.2]} />
        <directionalLight position={[6, 12, 8]} intensity={1.6} />
        <directionalLight position={[-8, 6, -4]} intensity={0.5} />
        {boxes.map((box) => {
          const selected =
            box.kind === 'wall' && selection?.kind === 'wall' && selection.id === box.elementId
          const color =
            box.kind === 'floor' ? COLORS.floor : selected ? COLORS.wallSelected : COLORS.wall
          return (
            <mesh key={box.key} position={box.center} rotation-y={box.rotationY}>
              <boxGeometry args={box.size} />
              <meshStandardMaterial color={color} roughness={0.9} />
              {box.kind === 'wall' && <Edges color={COLORS.edges} />}
            </mesh>
          )
        })}
        {equipment.map((item) => (
          <Equipment3D
            key={item.id}
            item={item}
            selected={selection?.kind === 'equipment' && selection.id === item.id}
            conflict={conflicts.has(item.id)}
          />
        ))}
        <OrbitControls makeDefault enableDamping={false} />
        <CameraRig boxes={boxes} resetToken={resetToken} />
      </Canvas>
      <button type="button" className="view3d-reset" onClick={() => setResetToken((t) => t + 1)}>
        Ponastavi pogled
      </button>
    </div>
  )
}
