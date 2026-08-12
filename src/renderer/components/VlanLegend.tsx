import { Panel } from '@xyflow/react'
import { useDiagramStore } from '../state/diagramStore'
import { VPN_EDGE_COLOR } from '../lib/vlanColors'

export default function VlanLegend() {
  const vlans = useDiagramStore((s) => s.vlans)
  const hasVpn = useDiagramStore((s) => s.edges.some((e) => e.data?.type === 'vpn'))

  if (vlans.length === 0 && !hasVpn) return null

  return (
    <Panel position="bottom-left" className="vlan-legend">
      {vlans.map((vlan) => (
        <div key={vlan.id} className="vlan-legend__item">
          <span className="vlan-legend__swatch" style={{ background: vlan.color }} />
          VLAN {vlan.id} — {vlan.name}
          {vlan.ip && <span className="vlan-legend__ip"> · {vlan.ip}</span>}
        </div>
      ))}
      {hasVpn && (
        <div className="vlan-legend__item">
          <span
            className="vlan-legend__swatch vlan-legend__swatch--dashed"
            style={{ borderColor: VPN_EDGE_COLOR }}
          />
          VPN
        </div>
      )}
    </Panel>
  )
}
