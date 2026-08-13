import { create } from 'zustand'
import {
  applyNodeChanges,
  applyEdgeChanges,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type Connection
} from '@xyflow/react'
import { v4 as uuid } from 'uuid'
import type { ConnectionEdgeData, DeviceNodeData, DeviceType, Diagram, Vlan } from '@shared/types'
import type { LlmDiagram } from '@shared/diagramSchema'
import type { ParsedPartialDiagram } from '../lib/partialDiagramParser'
import { layoutDiagram } from '../lib/layout'
import { colorForVlan } from '../lib/vlanColors'
import { deviceTypeConfig } from '../lib/deviceTypeConfig'

const STREAM_GRID_COLS = 6
const STREAM_GRID_STEP_X = 210
const STREAM_GRID_STEP_Y = 130

type DeviceNode = Node<DeviceNodeData>
type ConnectionEdge = Edge<ConnectionEdgeData>
type ShapeType = 'rectangle' | 'ellipse' | 'line' | 'text'

interface DiagramState {
  nodes: DeviceNode[]
  edges: ConnectionEdge[]
  vlans: Vlan[]
  selectedNodeId: string | null
  selectedEdgeId: string | null
  canUndo: boolean
  canRedo: boolean
  /** True once anything has changed since the last save/load for the tab
   * currently active in diagramStore. See tabsStore for how this is carried
   * across tab switches, and App.tsx for how it reaches the main process. */
  dirty: boolean

  onNodesChange: (changes: NodeChange<DeviceNode>[]) => void
  onEdgesChange: (changes: EdgeChange<ConnectionEdge>[]) => void
  onConnect: (connection: Connection) => void
  undo: () => void
  redo: () => void

  addDevice: (
    type: DeviceType,
    position?: { x: number; y: number },
    overrides?: { label?: string; vendorModel?: string; icon?: string }
  ) => void
  addImageNode: (imageDataUrl: string, position?: { x: number; y: number }) => void
  addGroupNode: (position?: { x: number; y: number }) => void
  addShapeNode: (type: ShapeType, position?: { x: number; y: number }) => void
  duplicateDevice: (id: string) => void
  updateDevice: (id: string, partial: Partial<Omit<DeviceNodeData, 'id'>>) => void
  updateManyDevices: (ids: string[], partial: Partial<Omit<DeviceNodeData, 'id'>>) => void
  removeDevice: (id: string) => void
  /** Called on drag-stop: reparents the node into whichever group frame it was
   * dropped on (or clears its group if dropped outside all of them). */
  reparentIfDropped: (id: string) => void

  updateConnection: (id: string, partial: Partial<Omit<ConnectionEdgeData, 'id'>>) => void
  removeConnection: (id: string) => void

  setSelectedNode: (id: string | null) => void
  setSelectedEdge: (id: string | null) => void

  addVlan: (vlan: Omit<Vlan, 'color'>) => void

  setDirty: (dirty: boolean) => void
  markSaved: () => void

  loadDiagram: (diagram: Diagram) => void
  beginGeneration: () => void
  applyPartialGeneratedDiagram: (partial: ParsedPartialDiagram) => void
  applyGeneratedDiagram: (generated: LlmDiagram) => void
  toDiagram: () => Diagram
  newDiagram: () => void
  autoArrange: () => void
}

function deviceNodeFromData(data: DeviceNodeData): DeviceNode {
  return {
    id: data.id,
    type: 'device',
    position: data.position,
    // Group frames render behind every other node regardless of array order.
    zIndex: data.type === 'group' ? -1 : undefined,
    // React Flow moves a node together with its parent automatically once
    // parentId is set — this is the whole "grouping" mechanism; `position`
    // becomes relative to the parent's position instead of absolute.
    parentId: data.groupId,
    data
  }
}

function connectionEdgeFromData(data: ConnectionEdgeData): ConnectionEdge {
  return {
    id: data.id,
    source: data.source,
    target: data.target,
    // React Flow reads these top-level fields (not data.*) to know which of a
    // node's several handles to actually draw the edge from/to. Fall back to the
    // default top-down flow (bottom -> top) for connections with no handle chosen
    // explicitly (e.g. everything the LLM generates).
    sourceHandle: data.sourceHandle ?? 'bottom',
    targetHandle: data.targetHandle ?? 'top',
    type: 'connection',
    data
  }
}

// Transient (non-reactive) bookkeeping for a single generation stream: maps the
// LLM's temporary refIds to stable node uuids so a device keeps the same node
// across chunks as more of its fields stream in.
let streamRefMap = new Map<string, string>()

// Generation is additive: whatever was already on the canvas when "Gerar diagrama"
// was clicked is kept, and the new response is merged in below it (use "Novo
// diagrama" to start from a blank canvas instead). These hold that snapshot for
// the duration of one generation (including all its streamed chunks).
let baseNodes: Node<DeviceNodeData>[] = []
let baseEdges: Edge<ConnectionEdgeData>[] = []
let baseVlans: Vlan[] = []
let streamYOffset = 0

function boundingBottom(nodes: Node<DeviceNodeData>[]): number {
  if (nodes.length === 0) return 0
  return Math.max(...nodes.map((n) => n.position.y + (n.data.size?.height ?? 84)))
}

// Undo/redo history. Snapshots hold the three arrays that make up a diagram;
// nodes/edges/vlans are always *replaced* wholesale (never mutated in place)
// elsewhere in this store, so a shallow reference per snapshot is safe.
interface DiagramSnapshot {
  nodes: DeviceNode[]
  edges: ConnectionEdge[]
  vlans: Vlan[]
}
let historyPast: DiagramSnapshot[] = []
let historyFuture: DiagramSnapshot[] = []
let historyGroupTimer: ReturnType<typeof setTimeout> | null = null
let historyGroupOpen = false
const HISTORY_LIMIT = 50
// Rapid-fire changes (typing in a field, dragging a node) within this window
// collapse into a single undo step instead of one per keystroke/frame.
const HISTORY_GROUP_MS = 600

function snapshotOf(state: DiagramState): DiagramSnapshot {
  return { nodes: state.nodes, edges: state.edges, vlans: state.vlans }
}

function resetHistory() {
  historyPast = []
  historyFuture = []
  historyGroupOpen = false
  if (historyGroupTimer) clearTimeout(historyGroupTimer)
}

/** Call before applying a mutation. `force` always opens a new undo step
 * (discrete actions like add/remove); otherwise rapid repeats within
 * HISTORY_GROUP_MS reuse the currently open step (typing, dragging).
 *
 * A forced commit never leaves the grouping window open afterwards — e.g.
 * adding a device then immediately typing its label must be two separate
 * undo steps (undo once to clear the typed text, again to remove the
 * device), not one that wipes both. Only a *soft* commit that itself opens
 * or extends a group keeps that window alive for the next soft commit. */
function commitHistory(
  get: () => DiagramState,
  set: (partial: Partial<DiagramState>) => void,
  force = false
) {
  if (force || !historyGroupOpen) {
    historyPast.push(snapshotOf(get()))
    if (historyPast.length > HISTORY_LIMIT) historyPast.shift()
    historyFuture = []
    set({ canUndo: true, canRedo: false, dirty: true })
  } else {
    set({ dirty: true })
  }
  historyGroupOpen = !force
  if (historyGroupTimer) clearTimeout(historyGroupTimer)
  historyGroupTimer = setTimeout(() => {
    historyGroupOpen = false
  }, HISTORY_GROUP_MS)
}

export const useDiagramStore = create<DiagramState>((set, get) => ({
  nodes: [],
  edges: [],
  vlans: [],
  selectedNodeId: null,
  selectedEdgeId: null,
  canUndo: false,
  canRedo: false,
  dirty: false,

  onNodesChange: (changes) => {
    if (changes.some((c) => c.type === 'remove')) commitHistory(get, set, true)
    else if (changes.some((c) => c.type === 'position')) commitHistory(get, set)
    // applyNodeChanges only updates the top-level `.position` used for
    // rendering — without this, `.data.position` (what toDiagram()/save/export
    // actually reads) would go stale the instant a node is dragged, silently
    // reverting to its pre-drag spot on the next save or tab switch.
    const updated = applyNodeChanges(changes, get().nodes).map((node) =>
      node.data.position.x !== node.position.x || node.data.position.y !== node.position.y
        ? { ...node, data: { ...node.data, position: node.position } }
        : node
    )
    set({ nodes: updated })
  },
  onEdgesChange: (changes) => {
    if (changes.some((c) => c.type === 'remove')) commitHistory(get, set, true)
    set({ edges: applyEdgeChanges(changes, get().edges) })
  },
  onConnect: (connection) => {
    if (!connection.source || !connection.target) return
    commitHistory(get, set, true)
    const data: ConnectionEdgeData = {
      id: uuid(),
      source: connection.source,
      target: connection.target,
      sourceHandle: connection.sourceHandle,
      targetHandle: connection.targetHandle,
      type: 'ethernet'
    }
    set({ edges: [...get().edges, connectionEdgeFromData(data)] })
  },

  undo: () => {
    if (historyPast.length === 0) return
    const current = snapshotOf(get())
    const prev = historyPast.pop()!
    historyFuture.push(current)
    historyGroupOpen = false
    set({
      ...prev,
      selectedNodeId: null,
      selectedEdgeId: null,
      canUndo: historyPast.length > 0,
      canRedo: true
    })
  },
  redo: () => {
    if (historyFuture.length === 0) return
    const current = snapshotOf(get())
    const next = historyFuture.pop()!
    historyPast.push(current)
    historyGroupOpen = false
    set({
      ...next,
      selectedNodeId: null,
      selectedEdgeId: null,
      canUndo: true,
      canRedo: historyFuture.length > 0
    })
  },

  addDevice: (type, position = { x: 100, y: 100 }, overrides) => {
    commitHistory(get, set, true)
    const data: DeviceNodeData = {
      id: uuid(),
      type,
      label: overrides?.label ?? deviceTypeConfig[type].label,
      vendorModel: overrides?.vendorModel,
      icon: overrides?.icon,
      position,
      metadata: {}
    }
    set({ nodes: [...get().nodes, deviceNodeFromData(data)] })
  },
  addImageNode: (imageDataUrl, position = { x: 100, y: 100 }) => {
    commitHistory(get, set, true)
    const data: DeviceNodeData = {
      id: uuid(),
      type: 'image',
      label: '',
      position,
      metadata: {},
      imageDataUrl,
      size: { width: 240, height: 160 }
    }
    set({ nodes: [...get().nodes, deviceNodeFromData(data)] })
  },
  addGroupNode: (position = { x: 80, y: 80 }) => {
    commitHistory(get, set, true)
    const data: DeviceNodeData = {
      id: uuid(),
      type: 'group',
      label: 'Grupo',
      position,
      metadata: {},
      size: { width: 420, height: 300 }
    }
    // Inserted at the front (not pushed to the end) so it renders/sits behind
    // every other node — group boxes are meant to visually frame devices
    // placed over them, not cover them.
    set({ nodes: [deviceNodeFromData(data), ...get().nodes] })
  },
  addShapeNode: (type, position = { x: 100, y: 100 }) => {
    commitHistory(get, set, true)
    const defaultSize =
      type === 'line'
        ? { width: 160, height: 2 }
        : type === 'text'
          ? { width: 140, height: 32 }
          : { width: 140, height: 100 }
    const data: DeviceNodeData = {
      id: uuid(),
      type,
      label: type === 'text' ? 'Texto' : '',
      position,
      metadata: {},
      size: defaultSize
    }
    set({ nodes: [...get().nodes, deviceNodeFromData(data)] })
  },

  duplicateDevice: (id) => {
    const original = get().nodes.find((n) => n.id === id)
    if (!original) return
    commitHistory(get, set, true)
    const data: DeviceNodeData = {
      ...original.data,
      id: uuid(),
      position: { x: original.data.position.x + 32, y: original.data.position.y + 32 }
    }
    set({
      nodes: [...get().nodes, deviceNodeFromData(data)],
      selectedNodeId: data.id,
      selectedEdgeId: null
    })
  },

  updateDevice: (id, partial) => {
    commitHistory(get, set)
    const nextPosition = partial.position as { x: number; y: number } | undefined
    set({
      nodes: get().nodes.map((node) =>
        node.id === id
          ? {
              ...node,
              // Keep the top-level Node.position (what React Flow actually
              // renders/drags) in sync whenever a caller updates data.position
              // directly — see the "position-sync gotcha" in CLAUDE.md.
              position: nextPosition ?? node.position,
              data: { ...node.data, ...partial }
            }
          : node
      )
    })
  },
  updateManyDevices: (ids, partial) => {
    if (ids.length === 0) return
    commitHistory(get, set, true)
    const idSet = new Set(ids)
    set({
      nodes: get().nodes.map((node) =>
        idSet.has(node.id) ? { ...node, data: { ...node.data, ...partial } } : node
      )
    })
  },
  removeDevice: (id) => {
    commitHistory(get, set, true)
    const state = get()
    const removed = state.nodes.find((n) => n.id === id)
    // Deleting a group shouldn't take its contents down with it — release
    // children back to absolute positioning first, otherwise they'd be left
    // with a parentId pointing at a node that no longer exists.
    const isGroup = removed?.data.type === 'group'
    const nodes = state.nodes
      .filter((node) => node.id !== id)
      .map((node) => {
        if (!isGroup || node.data.groupId !== id || !removed) return node
        const absolutePosition = { x: node.position.x + removed.position.x, y: node.position.y + removed.position.y }
        return {
          ...node,
          position: absolutePosition,
          parentId: undefined,
          data: { ...node.data, groupId: undefined, position: absolutePosition }
        }
      })
    set({
      nodes,
      edges: state.edges.filter((edge) => edge.source !== id && edge.target !== id),
      selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId
    })
  },

  reparentIfDropped: (id) => {
    const state = get()
    const node = state.nodes.find((n) => n.id === id)
    if (!node || node.data.type === 'group' || node.data.type === 'image') return

    const currentParent = node.data.groupId ? state.nodes.find((n) => n.id === node.data.groupId) : undefined
    // node.position is relative to currentParent when parentId is set — resolve
    // to absolute canvas coordinates so containment math is the same regardless
    // of whether the node started this drag already inside a group.
    const absolute = currentParent
      ? { x: node.position.x + currentParent.position.x, y: node.position.y + currentParent.position.y }
      : node.position
    const size = node.data.size ?? { width: 210, height: 84 }
    const centerX = absolute.x + size.width / 2
    const centerY = absolute.y + size.height / 2

    let bestGroup: DeviceNode | undefined
    let bestArea = Infinity
    for (const candidate of state.nodes) {
      if (candidate.data.type !== 'group' || candidate.id === id) continue
      const gw = candidate.data.size?.width ?? 420
      const gh = candidate.data.size?.height ?? 300
      const inside =
        centerX >= candidate.position.x &&
        centerX <= candidate.position.x + gw &&
        centerY >= candidate.position.y &&
        centerY <= candidate.position.y + gh
      if (inside && gw * gh < bestArea) {
        bestArea = gw * gh
        bestGroup = candidate
      }
    }

    const newGroupId = bestGroup?.id
    if (newGroupId === node.data.groupId) return

    commitHistory(get, set, true)
    const newPosition = bestGroup ? { x: absolute.x - bestGroup.position.x, y: absolute.y - bestGroup.position.y } : absolute
    set({
      nodes: state.nodes.map((n) =>
        n.id === id
          ? {
              ...n,
              position: newPosition,
              parentId: newGroupId,
              data: { ...n.data, groupId: newGroupId, position: newPosition }
            }
          : n
      )
    })
  },

  updateConnection: (id, partial) => {
    commitHistory(get, set)
    set({
      edges: get().edges.map((edge) =>
        edge.id === id ? { ...edge, data: { ...edge.data!, ...partial } } : edge
      )
    })
  },
  removeConnection: (id) => {
    commitHistory(get, set, true)
    set({
      edges: get().edges.filter((edge) => edge.id !== id),
      selectedEdgeId: get().selectedEdgeId === id ? null : get().selectedEdgeId
    })
  },

  setSelectedNode: (id) => set({ selectedNodeId: id, selectedEdgeId: id ? null : get().selectedEdgeId }),
  setSelectedEdge: (id) => set({ selectedEdgeId: id, selectedNodeId: id ? null : get().selectedNodeId }),

  addVlan: (vlan) => {
    if (get().vlans.some((v) => v.id === vlan.id)) return
    commitHistory(get, set, true)
    set({ vlans: [...get().vlans, { ...vlan, color: colorForVlan(vlan.id) }] })
  },

  setDirty: (dirty) => set({ dirty }),
  markSaved: () => set({ dirty: false }),

  loadDiagram: (diagram) => {
    resetHistory()
    set({
      nodes: diagram.devices.map(deviceNodeFromData),
      edges: diagram.connections.map(connectionEdgeFromData),
      vlans: diagram.vlans,
      selectedNodeId: null,
      selectedEdgeId: null,
      canUndo: false,
      canRedo: false,
      dirty: false
    })
  },

  beginGeneration: () => {
    commitHistory(get, set, true)
    streamRefMap = new Map()
    const state = get()
    baseNodes = state.nodes
    baseEdges = state.edges
    baseVlans = state.vlans
    streamYOffset = baseNodes.length > 0 ? boundingBottom(baseNodes) + 140 : 0
    set({ selectedNodeId: null, selectedEdgeId: null })
  },

  applyPartialGeneratedDiagram: (partial) => {
    const previousPositions = new Map(get().nodes.map((n) => [n.id, n.position]))

    const deviceNodes: DeviceNode[] = partial.devices.map((device, index) => {
      let id = streamRefMap.get(device.refId)
      if (!id) {
        id = uuid()
        streamRefMap.set(device.refId, id)
      }
      const position = previousPositions.get(id) ?? {
        x: 60 + (index % STREAM_GRID_COLS) * STREAM_GRID_STEP_X,
        y: streamYOffset + 60 + Math.floor(index / STREAM_GRID_COLS) * STREAM_GRID_STEP_Y
      }
      const data: DeviceNodeData = {
        id,
        type: device.type,
        label: device.label,
        vendorModel: device.vendorModel,
        position,
        metadata: {
          ip: device.ip,
          vlanIds: device.vlanIds,
          ports: device.ports,
          notes: device.notes
        }
      }
      return deviceNodeFromData(data)
    })

    const existingIds = new Set(baseNodes.map((n) => n.id))
    const resolveRef = (refId: string): string | undefined =>
      streamRefMap.get(refId) ?? (existingIds.has(refId) ? refId : undefined)

    const connectionEdges: ConnectionEdge[] = partial.connections
      .filter((c) => resolveRef(c.sourceRefId) && resolveRef(c.targetRefId))
      .map((c, index) =>
        connectionEdgeFromData({
          id: `stream-edge-${index}`,
          source: resolveRef(c.sourceRefId)!,
          target: resolveRef(c.targetRefId)!,
          type: c.type,
          label: c.label,
          vlanId: c.vlanId ?? null
        })
      )

    const newVlans: Vlan[] = partial.vlans
      .filter((v) => !baseVlans.some((bv) => bv.id === v.id))
      .map((v) => ({ id: v.id, name: v.name, color: colorForVlan(v.id), ip: v.ip }))

    set({
      nodes: [...baseNodes, ...deviceNodes],
      edges: [...baseEdges, ...connectionEdges],
      vlans: [...baseVlans, ...newVlans]
    })
  },

  applyGeneratedDiagram: (generated) => {
    const refIdToUuid = new Map<string, string>()
    for (const device of generated.devices) {
      refIdToUuid.set(device.refId, uuid())
    }

    const deviceData: DeviceNodeData[] = generated.devices.map((device) => ({
      id: refIdToUuid.get(device.refId)!,
      type: device.type,
      label: device.label,
      vendorModel: device.vendorModel,
      position: { x: 0, y: 0 },
      metadata: {
        ip: device.ip,
        vlanIds: device.vlanIds,
        ports: device.ports,
        notes: device.notes
      }
    }))

    const existingIds = new Set(baseNodes.map((n) => n.id))
    const resolveRef = (refId: string): string | undefined =>
      refIdToUuid.get(refId) ?? (existingIds.has(refId) ? refId : undefined)

    const connectionData: ConnectionEdgeData[] = generated.connections
      .filter((c) => resolveRef(c.sourceRefId) && resolveRef(c.targetRefId))
      .map((c) => ({
        id: uuid(),
        source: resolveRef(c.sourceRefId)!,
        target: resolveRef(c.targetRefId)!,
        type: c.type,
        label: c.label,
        vlanId: c.vlanId ?? null
      }))

    const newVlans: Vlan[] = generated.vlans
      .filter((v) => !baseVlans.some((bv) => bv.id === v.id))
      .map((v) => ({ id: v.id, name: v.name, color: colorForVlan(v.id), ip: v.ip }))

    const positionedNewNodes = layoutDiagram(
      deviceData.map(deviceNodeFromData),
      connectionData.map(connectionEdgeFromData)
    ).map((node) => ({
      ...node,
      position: { x: node.position.x, y: node.position.y + streamYOffset },
      data: { ...node.data, position: { x: node.position.x, y: node.position.y + streamYOffset } }
    }))

    set({
      nodes: [...baseNodes, ...positionedNewNodes],
      edges: [...baseEdges, ...connectionData.map(connectionEdgeFromData)],
      vlans: [...baseVlans, ...newVlans],
      selectedNodeId: null,
      selectedEdgeId: null
    })
  },

  toDiagram: () => {
    const { nodes, edges, vlans } = get()
    return {
      version: 1,
      devices: nodes.map((n) => n.data),
      connections: edges.map((e) => e.data!),
      vlans
    }
  },

  newDiagram: () => {
    resetHistory()
    set({
      nodes: [],
      edges: [],
      vlans: [],
      selectedNodeId: null,
      selectedEdgeId: null,
      canUndo: false,
      canRedo: false,
      dirty: false
    })
  },

  autoArrange: () => {
    commitHistory(get, set, true)
    set({ nodes: layoutDiagram(get().nodes, get().edges) })
  }
}))
