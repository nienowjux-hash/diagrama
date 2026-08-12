import { Trash2 } from 'lucide-react'
import { useDiagramStore } from '../state/diagramStore'
import type { ConnectionType } from '@shared/types'

const CONNECTION_TYPE_LABELS: Record<ConnectionType, string> = {
  ethernet: 'Ethernet',
  trunk: 'Trunk',
  vpn: 'VPN',
  wireless: 'Wireless'
}

export default function EdgePropertiesPanel() {
  const selectedEdgeId = useDiagramStore((s) => s.selectedEdgeId)
  const edge = useDiagramStore((s) => s.edges.find((e) => e.id === s.selectedEdgeId))
  const updateConnection = useDiagramStore((s) => s.updateConnection)
  const removeConnection = useDiagramStore((s) => s.removeConnection)

  if (!selectedEdgeId || !edge || !edge.data) return null
  const data = edge.data

  return (
    <div className="properties-panel">
      <div className="properties-panel__header">
        <span>Conexão</span>
        <button
          type="button"
          className="icon-button icon-button--danger"
          title="Excluir conexão"
          onClick={() => removeConnection(selectedEdgeId)}
        >
          <Trash2 size={15} />
        </button>
      </div>

      <label className="field">
        <span>Tipo</span>
        <select
          value={data.type}
          onChange={(e) => updateConnection(selectedEdgeId, { type: e.target.value as ConnectionType })}
        >
          {Object.entries(CONNECTION_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>Rótulo</span>
        <input
          value={data.label ?? ''}
          placeholder="ex: Trunk 1G"
          onChange={(e) => updateConnection(selectedEdgeId, { label: e.target.value })}
        />
      </label>

      <label className="field">
        <span>VLAN</span>
        <input
          type="number"
          value={data.vlanId ?? ''}
          placeholder="ex: 10"
          onChange={(e) =>
            updateConnection(selectedEdgeId, {
              vlanId: e.target.value ? parseInt(e.target.value, 10) : null
            })
          }
        />
      </label>
    </div>
  )
}
