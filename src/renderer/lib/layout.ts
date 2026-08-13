import dagre from '@dagrejs/dagre'
import type { Node, Edge } from '@xyflow/react'
import { isRealDevice, type DeviceNodeData, type ConnectionEdgeData } from '@shared/types'

const NODE_WIDTH = 210
const NODE_HEIGHT = 84

/**
 * Assigns x/y positions to nodes using a top-down hierarchical layout
 * (rank by connection direction, since prompt.ts instructs the LLM to
 * express connections roughly WAN -> firewall -> switch -> leaf).
 * Spacing widens for larger diagrams, where hub nodes (core switches,
 * firewalls) accumulate many redundant links and need more breathing room.
 */
export function layoutDiagram(
  nodes: Node<DeviceNodeData>[],
  edges: Edge<ConnectionEdgeData>[]
): Node<DeviceNodeData>[] {
  // Images, group frames, and drawing shapes are decorative/reference
  // elements, not part of the network topology — leave them wherever the
  // user placed them instead of pulling them into the graph. Devices
  // parented to a group are skipped too: dagre would compute an
  // absolute-space position for them, but their `position` is relative to
  // the group once grouped, so writing dagre's result there would fling them
  // far from their group frame.
  const layoutable = nodes.filter((n) => isRealDevice(n.data.type) && !n.data.groupId)

  const scale = layoutable.length > 40 ? 1.6 : layoutable.length > 20 ? 1.3 : 1
  const graph = new dagre.graphlib.Graph()
  graph.setDefaultEdgeLabel(() => ({}))
  graph.setGraph({
    rankdir: 'TB',
    nodesep: Math.round(70 * scale),
    ranksep: Math.round(130 * scale),
    marginx: 40,
    marginy: 40
  })

  for (const node of layoutable) {
    const { width, height } = node.data.size ?? { width: NODE_WIDTH, height: NODE_HEIGHT }
    graph.setNode(node.id, { width, height })
  }
  for (const edge of edges) {
    if (graph.hasNode(edge.source) && graph.hasNode(edge.target)) graph.setEdge(edge.source, edge.target)
  }

  dagre.layout(graph)

  return nodes.map((node) => {
    const pos = graph.node(node.id)
    if (!pos) return node
    const { width, height } = node.data.size ?? { width: NODE_WIDTH, height: NODE_HEIGHT }
    const position = { x: pos.x - width / 2, y: pos.y - height / 2 }
    return { ...node, position, data: { ...node.data, position } }
  })
}
