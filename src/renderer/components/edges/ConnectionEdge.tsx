import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps, type Edge } from '@xyflow/react'
import { Lock, Layers, Wifi } from 'lucide-react'
import type { ConnectionEdgeData, ConnectionType } from '@shared/types'
import {
  NEUTRAL_EDGE_COLOR,
  VPN_EDGE_COLOR,
  TRUNK_EDGE_COLOR,
  WIRELESS_EDGE_COLOR,
  colorForVlan
} from '../../lib/vlanColors'

type ConnectionEdgeType = Edge<ConnectionEdgeData>

const TYPE_STYLE: Record<
  ConnectionType,
  { color: string; width: number; dash?: string; animated?: boolean; icon?: typeof Lock }
> = {
  ethernet: { color: NEUTRAL_EDGE_COLOR, width: 2 },
  trunk: { color: TRUNK_EDGE_COLOR, width: 4, icon: Layers },
  vpn: { color: VPN_EDGE_COLOR, width: 2.5, dash: '7 5', animated: true, icon: Lock },
  wireless: { color: WIRELESS_EDGE_COLOR, width: 2, dash: '1.5 6', icon: Wifi }
}

export default function ConnectionEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected
}: EdgeProps<ConnectionEdgeType>) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    curvature: 0.35
  })

  const type = data?.type ?? 'ethernet'
  const style = TYPE_STYLE[type]
  const color = data?.vlanId != null && type !== 'vpn' ? colorForVlan(data.vlanId) : style.color
  const Icon = style.icon

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        className={style.animated ? 'connection-edge--vpn' : undefined}
        style={{
          stroke: color,
          strokeWidth: selected ? style.width + 1 : style.width,
          strokeDasharray: style.dash,
          strokeLinecap: style.dash ? 'round' : undefined,
          filter: selected ? `drop-shadow(0 0 4px ${color}aa)` : undefined
        }}
      />
      {(data?.label || Icon) && (
        <EdgeLabelRenderer>
          <div
            className="connection-edge__label"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              borderColor: color,
              color
            }}
          >
            {Icon && <Icon size={11} />}
            {data?.label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}
