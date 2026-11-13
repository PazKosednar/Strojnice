import { beforeEach, describe, expect, it } from 'vitest'
import { createRectangularRoom } from '../core/rectangularRoom'
import { createEmptyScene } from '../core/scene'
import { addWalls, removeWall, setWallLength } from '../core/wallOps'
import { useEditorStore } from './editorStore'

const store = () => useEditorStore.getState()
const scene = () => store().history.present

function addRoom() {
  let n = 0
  const walls = createRectangularRoom(3200, 1800, scene().settings, () => `w${++n}`)
  return store().apply((s) => addWalls(s, walls))
}

describe('editorStore', () => {
  beforeEach(() => store().load('p1', createEmptyScene()))

  it('applies an edit as an undoable step', () => {
    expect(addRoom()).toBe(true)
    expect(scene().walls).toHaveLength(4)
    store().undo()
    expect(scene().walls).toHaveLength(0)
    store().redo()
    expect(scene().walls).toHaveLength(4)
  })

  it('keeps the scene and shows a Slovenian message when an edit is rejected', () => {
    addRoom()
    const before = scene()
    expect(store().apply((s) => setWallLength(s, 'w1', 0))).toBe(false)
    expect(scene()).toBe(before)
    expect(store().message).toBe('Vrednost mora biti celo število v mm, večje od 0.')
  })

  it('records a whole gesture as one undo step', () => {
    addRoom()
    store().beginGesture()
    store().preview((s) => setWallLength(s, 'w1', 3300))
    store().preview((s) => setWallLength(s, 'w1', 3400))
    store().endGesture()
    expect(scene().walls[0]!.end.x).toBe(3400)
    store().undo()
    expect(scene().walls[0]!.end.x).toBe(3200)
    store().undo()
    expect(scene().walls).toHaveLength(0)
  })

  it('does not record a gesture that changed nothing', () => {
    addRoom()
    const pastLength = store().history.past.length
    store().beginGesture()
    store().endGesture()
    expect(store().history.past).toHaveLength(pastLength)
  })

  it('clears the selection when the selected element disappears', () => {
    addRoom()
    store().select({ kind: 'wall', id: 'w2' })
    store().apply((s) => removeWall(s, 'w2'))
    expect(store().selection).toBeNull()
  })

  it('amends the current step without a new undo step', () => {
    addRoom()
    const steps = store().history.past.length
    expect(store().amend((s) => setWallLength(s, 'w1', 3300))).toBe(true)
    expect(store().history.past).toHaveLength(steps)
    expect(scene().walls[0]!.end.x).toBe(3300)
    // Undo reverts the amended change together with the step it belongs to.
    store().undo()
    expect(scene().walls).toHaveLength(0)
  })

  it('ignores a failing amend silently', () => {
    addRoom()
    const before = scene()
    expect(store().amend((s) => setWallLength(s, 'w1', 0))).toBe(false)
    expect(scene()).toBe(before)
    expect(store().message).toBeNull()
  })

  it('toggles systems in the legend', () => {
    store().toggleSystem('cold')
    store().toggleSystem('dhw')
    expect(store().hiddenSystems).toEqual(['cold', 'dhw'])
    store().toggleSystem('cold')
    expect(store().hiddenSystems).toEqual(['dhw'])
    store().showAllSystems()
    expect(store().hiddenSystems).toEqual([])
  })
})
