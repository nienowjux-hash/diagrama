import { useCallback, useEffect, useMemo, type RefObject } from 'react'
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ConnectionMode,
  type NodeTypes,
  type EdgeTypes,
  type Node
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useDiagramStore } from '../state/diagramStore'
import { useUiPreferencesStore } from '../state/uiPreferencesStore'
import DeviceNode from './nodes/DeviceNode'
import ConnectionEdge from './edges/ConnectionEdge'
import VlanLegend from './VlanLegend'
import CanvasSearch from './CanvasSearch'
import { deviceTypeConfig } from '../lib/deviceTypeConfig'
import type { DeviceNodeData } from '@shared/types'
import { NEUTRAL_EDGE_COLOR } from '../lib/vlanColors'

const nodeTypes: NodeTypes = { device: DeviceNode }
const edgeTypes: EdgeTypes = { connection: ConnectionEdge }

const GRID_VARIANT_MAP = {
  dots: BackgroundVariant.Dots,
  lines: BackgroundVariant.Lines,
  cross: BackgroundVariant.Cross
} as const

function minimapNodeColor(node: Node<DeviceNodeData>): string {
  return deviceTypeConfig[node.data.type]?.color ?? NEUTRAL_EDGE_COLOR
}

export default function DiagramCanvas({
  containerRef
}: {
  containerRef: RefObject<HTMLDivElement | null>
}) {
  const nodes = useDiagramStore((s) => s.nodes)
  const edges = useDiagramStore((s) => s.edges)
  const onNodesChange = useDiagramStore((s) => s.onNodesChange)
  const onEdgesChange = useDiagramStore((s) => s.onEdgesChange)
  const onConnect = useDiagramStore((s) => s.onConnect)
  const setSelectedNode = useDiagramStore((s) => s.setSelectedNode)
  const setSelectedEdge = useDiagramStore((s) => s.setSelectedEdge)
  const duplicateDevice = useDiagramStore((s) => s.duplicateDevice)
  const reparentIfDropped = useDiagramStore((s) => s.reparentIfDropped)
  const undo = useDiagramStore((s) => s.undo)
  const redo = useDiagramStore((s) => s.redo)
  const theme = useUiPreferencesStore((s) => s.theme)
  const gridVariant = useUiPreferencesStore((s) => s.gridVariant)
  const gridGap = useUiPreferencesStore((s) => s.gridGap)

  const handlePaneClick = useCallback(() => {
    setSelectedNode(null)
    setSelectedEdge(null)
  }, [setSelectedNode, setSelectedEdge])

  useEffect(() => {
    function isEditingText(target: EventTarget | null) {
      const el = target as HTMLElement | null
      return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (isEditingText(e.target)) return
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        const selectedId = useDiagramStore.getState().selectedNodeId
        if (selectedId) {
          e.preventDefault()
          duplicateDevice(selectedId)
        }
        return
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) redo()
        else undo()
        return
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [duplicateDevice, undo, redo])

  const memoNodeTypes = useMemo(() => nodeTypes, [])
  const memoEdgeTypes = useMemo(() => edgeTypes, [])

  return (
    <div className="diagram-canvas" ref={containerRef}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={(_e, node) => setSelectedNode(node.id)}
        onNodeDragStop={(_e, node) => reparentIfDropped(node.id)}
        onEdgeClick={(_e, edge) => setSelectedEdge(edge.id)}
        onPaneClick={handlePaneClick}
        nodeTypes={memoNodeTypes}
        edgeTypes={memoEdgeTypes}
        defaultEdgeOptions={{ type: 'connection' }}
        connectionLineStyle={{ stroke: 'var(--accent)', strokeWidth: 2.5 }}
        connectionMode={ConnectionMode.Loose}
        connectionRadius={8}
        colorMode={theme}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        minZoom={0.2}
        maxZoom={2}
        deleteKeyCode={['Delete', 'Backspace']}
      >
        {gridVariant !== 'none' && (
          <Background
            variant={GRID_VARIANT_MAP[gridVariant]}
            gap={gridGap}
            size={1.4}
            className="diagram-canvas__bg"
          />
        )}
        <Controls showInteractive={false} />
        <MiniMap pannable zoomable nodeColor={minimapNodeColor} nodeStrokeWidth={0} />
        <VlanLegend />
        <CanvasSearch />
      </ReactFlow>
    </div>
  )
}
