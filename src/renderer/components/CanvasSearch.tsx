import { useMemo, useState } from 'react'
import { Panel, useReactFlow, type Node } from '@xyflow/react'
import { Search } from 'lucide-react'
import { useDiagramStore } from '../state/diagramStore'
import type { DeviceNodeData } from '@shared/types'

const RESULT_LIMIT = 8

// Rendered as a child of <ReactFlow> (like VlanLegend/MiniMap) so useReactFlow
// picks up the surrounding provider context without a separate wrapper.
export default function CanvasSearch() {
  const nodes = useDiagramStore((s) => s.nodes)
  const setSelectedNode = useDiagramStore((s) => s.setSelectedNode)
  const { setCenter } = useReactFlow()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return nodes
      .filter(
        (n) =>
          n.data.type !== 'image' &&
          n.data.type !== 'group' &&
          (n.data.label.toLowerCase().includes(q) || n.data.metadata.ip?.toLowerCase().includes(q))
      )
      .slice(0, RESULT_LIMIT)
  }, [nodes, query])

  function goTo(node: Node<DeviceNodeData>) {
    const width = node.data.size?.width ?? 200
    const height = node.data.size?.height ?? 84
    setCenter(node.position.x + width / 2, node.position.y + height / 2, { zoom: 1.1, duration: 400 })
    setSelectedNode(node.id)
    setQuery('')
    setOpen(false)
  }

  return (
    <Panel position="top-right" className="canvas-search">
      <div className="canvas-search__box">
        <Search size={14} />
        <input
          placeholder="Buscar dispositivo ou IP..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && results[0]) goTo(results[0])
            if (e.key === 'Escape') {
              setQuery('')
              setOpen(false)
            }
          }}
        />
      </div>
      {open && results.length > 0 && (
        <div className="canvas-search__results">
          {results.map((n) => (
            <button key={n.id} type="button" className="canvas-search__result" onClick={() => goTo(n)}>
              <span className="canvas-search__result-label">{n.data.label}</span>
              {n.data.metadata.ip && <span className="canvas-search__result-ip">{n.data.metadata.ip}</span>}
            </button>
          ))}
        </div>
      )}
    </Panel>
  )
}
