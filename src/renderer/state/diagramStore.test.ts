import { describe, it, expect, beforeEach } from 'vitest'
import { useDiagramStore } from './diagramStore'

// diagramStore is a singleton (module-level state), so every test starts from
// a clean slate via the public newDiagram() action — it's also the thing that
// resets undo/redo history, which nothing else exposes directly.
beforeEach(() => {
  useDiagramStore.getState().newDiagram()
})

describe('diagramStore basic CRUD', () => {
  it('addDevice adds a node and marks the diagram dirty', () => {
    expect(useDiagramStore.getState().dirty).toBe(false)
    useDiagramStore.getState().addDevice('server')
    const state = useDiagramStore.getState()
    expect(state.nodes).toHaveLength(1)
    expect(state.dirty).toBe(true)
  })

  it('removeDevice removes the node and any edges touching it', () => {
    useDiagramStore.getState().addDevice('server', { x: 0, y: 0 })
    useDiagramStore.getState().addDevice('switch', { x: 100, y: 100 })
    const [a, b] = useDiagramStore.getState().nodes
    useDiagramStore.getState().onConnect({ source: a.id, target: b.id, sourceHandle: null, targetHandle: null })
    expect(useDiagramStore.getState().edges).toHaveLength(1)

    useDiagramStore.getState().removeDevice(a.id)
    const state = useDiagramStore.getState()
    expect(state.nodes).toHaveLength(1)
    expect(state.edges).toHaveLength(0)
  })
})

describe('diagramStore dirty tracking', () => {
  it('markSaved clears dirty', () => {
    useDiagramStore.getState().addDevice('server')
    expect(useDiagramStore.getState().dirty).toBe(true)
    useDiagramStore.getState().markSaved()
    expect(useDiagramStore.getState().dirty).toBe(false)
  })

  it('loadDiagram resets dirty to false', () => {
    useDiagramStore.getState().addDevice('server')
    useDiagramStore.getState().loadDiagram({ version: 1, devices: [], connections: [], vlans: [] })
    expect(useDiagramStore.getState().dirty).toBe(false)
  })
})

describe('diagramStore undo/redo', () => {
  it('undo reverts the last discrete action', () => {
    useDiagramStore.getState().addDevice('server')
    expect(useDiagramStore.getState().nodes).toHaveLength(1)
    useDiagramStore.getState().undo()
    expect(useDiagramStore.getState().nodes).toHaveLength(0)
  })

  it('redo re-applies an undone action', () => {
    useDiagramStore.getState().addDevice('server')
    useDiagramStore.getState().undo()
    useDiagramStore.getState().redo()
    expect(useDiagramStore.getState().nodes).toHaveLength(1)
  })

  it('undo is a no-op with an empty history', () => {
    useDiagramStore.getState().undo()
    expect(useDiagramStore.getState().nodes).toHaveLength(0)
    expect(useDiagramStore.getState().canUndo).toBe(false)
  })

  it('a new action after undo clears the redo stack', () => {
    useDiagramStore.getState().addDevice('server')
    useDiagramStore.getState().undo()
    useDiagramStore.getState().addDevice('switch')
    expect(useDiagramStore.getState().canRedo).toBe(false)
  })

  it('rapid updateDevice calls on the same node collapse into a single undo step', () => {
    useDiagramStore.getState().addDevice('server')
    const id = useDiagramStore.getState().nodes[0].id
    const originalLabel = useDiagramStore.getState().nodes[0].data.label

    useDiagramStore.getState().updateDevice(id, { label: 'a' })
    useDiagramStore.getState().updateDevice(id, { label: 'ab' })
    useDiagramStore.getState().updateDevice(id, { label: 'abc' })
    expect(useDiagramStore.getState().nodes[0].data.label).toBe('abc')

    // One undo should revert all three rapid edits at once, straight back to
    // the label from addDevice — not just the second-to-last keystroke.
    useDiagramStore.getState().undo()
    expect(useDiagramStore.getState().nodes[0].data.label).toBe(originalLabel)
  })
})

describe('diagramStore group nesting', () => {
  it('addGroupNode inserts the frame before existing devices (renders behind them)', () => {
    useDiagramStore.getState().addDevice('server')
    useDiagramStore.getState().addGroupNode()
    expect(useDiagramStore.getState().nodes[0].data.type).toBe('group')
  })

  it('reparentIfDropped assigns groupId when a device is dropped inside a group frame', () => {
    useDiagramStore.getState().addGroupNode({ x: 0, y: 0 })
    const group = useDiagramStore.getState().nodes[0]
    useDiagramStore.getState().addDevice('server', { x: 20, y: 20 })
    const device = useDiagramStore.getState().nodes.find((n) => n.id !== group.id)!

    useDiagramStore.getState().reparentIfDropped(device.id)

    const updated = useDiagramStore.getState().nodes.find((n) => n.id === device.id)!
    expect(updated.data.groupId).toBe(group.id)
    // Position becomes relative to the group's origin (0,0), so still (20,20) here.
    expect(updated.position).toEqual({ x: 20, y: 20 })
  })

  it('reparentIfDropped clears groupId when dropped outside every group frame', () => {
    useDiagramStore.getState().addGroupNode({ x: 0, y: 0 })
    const group = useDiagramStore.getState().nodes[0]
    useDiagramStore.getState().addDevice('server', { x: 20, y: 20 })
    const deviceId = useDiagramStore.getState().nodes.find((n) => n.id !== group.id)!.id
    useDiagramStore.getState().reparentIfDropped(deviceId)
    expect(useDiagramStore.getState().nodes.find((n) => n.id === deviceId)!.data.groupId).toBe(group.id)

    // Move it far away (outside the group's default 420x300 box) via the same
    // path a real drag uses — updateDevice only touches `.data`, not the
    // top-level `.position` that reparentIfDropped's containment math reads.
    useDiagramStore.getState().onNodesChange([{ id: deviceId, type: 'position', position: { x: 5000, y: 5000 } }])
    useDiagramStore.getState().reparentIfDropped(deviceId)
    expect(useDiagramStore.getState().nodes.find((n) => n.id === deviceId)!.data.groupId).toBeUndefined()
  })

  it('removing a group releases its children back to absolute positioning', () => {
    useDiagramStore.getState().addGroupNode({ x: 100, y: 100 })
    const group = useDiagramStore.getState().nodes[0]
    useDiagramStore.getState().addDevice('server', { x: 120, y: 120 })
    const deviceId = useDiagramStore.getState().nodes.find((n) => n.id !== group.id)!.id
    useDiagramStore.getState().reparentIfDropped(deviceId)
    const relative = useDiagramStore.getState().nodes.find((n) => n.id === deviceId)!.position

    useDiagramStore.getState().removeDevice(group.id)

    const freed = useDiagramStore.getState().nodes.find((n) => n.id === deviceId)!
    expect(freed.data.groupId).toBeUndefined()
    expect(freed.position).toEqual({ x: relative.x + group.position.x, y: relative.y + group.position.y })
  })
})

describe('diagramStore updateManyDevices', () => {
  it('applies a top-level field to every id without touching others', () => {
    useDiagramStore.getState().addDevice('server', { x: 0, y: 0 }, { label: 'A' })
    useDiagramStore.getState().addDevice('server', { x: 0, y: 0 }, { label: 'B' })
    useDiagramStore.getState().addDevice('server', { x: 0, y: 0 }, { label: 'C' })
    const [a, b, c] = useDiagramStore.getState().nodes

    useDiagramStore.getState().updateManyDevices([a.id, b.id], { color: '#123456' })

    const state = useDiagramStore.getState()
    expect(state.nodes.find((n) => n.id === a.id)!.data.color).toBe('#123456')
    expect(state.nodes.find((n) => n.id === b.id)!.data.color).toBe('#123456')
    expect(state.nodes.find((n) => n.id === c.id)!.data.color).toBeUndefined()
  })
})
