import { OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { useMemo, useState } from 'react'
import { equipmentTo3d } from '../core/equipmentTo3d'
import { pipesTo3d } from '../core/pipesTo3d'
import { pointTo3d, sceneToBoxes, spaceToBoxes, wallBaseBoxes } from '../core/sceneToBoxes'
import { WALL_BASE_HEIGHT, wallFacings } from '../core/wallVisibility'
import { equipmentWithConflicts, sceneWarnings } from '../core/sceneWarnings'
import { useAutoConnectStore } from '../stores/autoConnectStore'
import { selectScene, useEditorStore } from '../stores/editorStore'
import { CameraRig } from './CameraRig'
import { Equipment3D } from './Equipment3D'
import { Pipes3D } from './Pipes3D'
import { Highlight3D, Space3D } from './Space3D'
import { Floor, StudioLights } from './Studio'
import { Walls3D } from './Walls3D'

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
  const pipes = useMemo(() => pipesTo3d(scene), [scene])
  const space = useMemo(() => spaceToBoxes(scene), [scene])
  const preview = useAutoConnectStore((s) => (s.stage === 'preview' ? s.preview : null))
  const previewIds = useAutoConnectStore((s) => s.previewIds)
  const proposedPipes = useMemo(() => {
    if (!preview) return null
    const all = pipesTo3d({ ...preview, terminals: [] })
    const ids = new Set(previewIds)
    return {
      segments: all.segments.filter((s) => ids.has(s.pipeId)),
      joints: all.joints.filter((j) => ids.has(j.pipeId)),
      elbows: all.elbows.filter((e) => ids.has(e.pipeId)),
      terminals: [],
    }
  }, [preview, previewIds])
  const highlight = useEditorStore((s) => s.highlight)
  const wallBoxes = useMemo(() => boxes.filter((b) => b.kind === 'wall'), [boxes])
  const baseBoxes = useMemo(() => wallBaseBoxes(boxes, WALL_BASE_HEIGHT), [boxes])
  const facings = useMemo(() => wallFacings(scene), [scene])
  const hiddenSystems = useEditorStore((s) => s.hiddenSystems)
  const wallViewMode = useEditorStore((s) => s.wallViewMode)
  const pipeLook = useEditorStore((s) => s.pipeLook)
  const [resetToken, setResetToken] = useState(0)

  return (
    <div className="view3d">
      <Canvas
        frameloop="demand"
        dpr={[1, 2]}
        camera={{ fov: 35, near: 0.05, far: 500, position: [6, 6, 8] }}
        aria-label="3D pogled"
      >
        <color attach="background" args={['#f3f4f2']} />
        <StudioLights />
        <Floor floor={boxes.find((box) => box.kind === 'floor')} />
        <Walls3D
          boxes={wallBoxes}
          baseBoxes={baseBoxes}
          facings={facings}
          mode={wallViewMode}
          selectedWallId={selection?.kind === 'wall' ? selection.id : null}
        />
        <Pipes3D
          pipes={pipes}
          hiddenSystems={hiddenSystems}
          selectedPipeId={selection?.kind === 'pipe' ? selection.id : null}
          look={pipeLook}
        />
        {equipment.map((item) => (
          <Equipment3D
            key={item.id}
            item={item}
            selected={selection?.kind === 'equipment' && selection.id === item.id}
            conflict={conflicts.has(item.id)}
            hiddenSystems={hiddenSystems}
          />
        ))}
        {proposedPipes && (
          <Pipes3D
            pipes={proposedPipes}
            hiddenSystems={hiddenSystems}
            selectedPipeId={null}
            look={pipeLook}
            ghost
          />
        )}
        <Space3D
          boxes={space}
          selectedId={
            selection?.kind === 'obstacle' || selection?.kind === 'zone' ? selection.id : null
          }
        />
        <Highlight3D position={highlight ? pointTo3d(highlight) : null} />
        <OrbitControls makeDefault enableDamping={false} />
        <CameraRig boxes={boxes} resetToken={resetToken} />
      </Canvas>
      <button type="button" className="view3d-reset" onClick={() => setResetToken((t) => t + 1)}>
        Ponastavi pogled
      </button>
    </div>
  )
}
