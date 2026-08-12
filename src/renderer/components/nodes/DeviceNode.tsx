import { Handle, Position, NodeResizer, type NodeProps, type Node } from '@xyflow/react'
import { Router } from 'lucide-react'
import type { DeviceNodeData } from '@shared/types'
import { deviceTypeConfig } from '../../lib/deviceTypeConfig'
import { DEVICE_ICONS } from '../../lib/deviceIcons'
import { gradientFromColor } from '../../lib/colorUtils'
import { useDiagramStore } from '../../state/diagramStore'

type DeviceNodeType = Node<DeviceNodeData>

const MIN_SIZE = { width: 160, height: 64 }
const MIN_IMAGE_SIZE = { width: 100, height: 80 }
const MIN_GROUP_SIZE = { width: 220, height: 140 }

/**
 * Renders a source AND a target Handle stacked at the same spot/id. A single
 * Handle can only ever be one type, but with connectionMode="loose" the user
 * can start or end a drag on *any* side — and when two same-typed handles
 * (e.g. two "target" handles) end up as the two ends of a connection, React
 * Flow can't find that id in the resulting node's *other* type's handle
 * registry and silently drops the edge (logs "Couldn't create edge for
 * source/target handle id", never renders it). Registering both types at
 * every position means whichever role a handle ends up playing after the
 * drag, the lookup succeeds. Verified against React Flow's own edge-render
 * lookup with a scripted drag test (see git history) — this isn't a guess.
 */
function DualHandle({ id, position, className }: { id: string; position: Position; className?: string }) {
  return (
    <>
      <Handle type="source" id={id} position={position} className={className} />
      <Handle type="target" id={id} position={position} className={className} />
    </>
  )
}

export default function DeviceNode({ id, data, selected }: NodeProps<DeviceNodeType>) {
  const updateDevice = useDiagramStore((s) => s.updateDevice)
  const config = deviceTypeConfig[data.type]

  if (data.type === 'group') {
    // Purely a visual frame — no handles (not part of the network graph) and
    // rendered with zIndex -1 (see diagramStore) so devices placed over it
    // stay on top and clickable; it doesn't move its "contents" together
    // since React Flow parent/child node nesting isn't wired up here.
    return (
      <div
        className={`device-node--group${selected ? ' device-node--group-selected' : ''}`}
        style={{ ...(data.size ?? {}), ['--group-color' as string]: data.color ?? config.color }}
      >
        <NodeResizer
          isVisible={selected}
          minWidth={MIN_GROUP_SIZE.width}
          minHeight={MIN_GROUP_SIZE.height}
          onResizeEnd={(_e, params) => updateDevice(id, { size: { width: params.width, height: params.height } })}
        />
        <div className="device-node__group-label">{data.label || 'Grupo'}</div>
      </div>
    )
  }

  if (data.type === 'image') {
    return (
      <div className="device-node device-node--image" style={data.size}>
        <NodeResizer
          isVisible={selected}
          minWidth={MIN_IMAGE_SIZE.width}
          minHeight={MIN_IMAGE_SIZE.height}
          // The resizer's full-edge "line" controls run right through the
          // same center point as the top/bottom connection Handles below and
          // sit above them in the DOM while selected, silently swallowing the
          // mousedown that should start a connection drag. Resizing still
          // works fine via the 4 corner handles, which this doesn't affect.
          lineStyle={{ pointerEvents: 'none' }}
          onResizeEnd={(_e, params) =>
            updateDevice(id, { size: { width: params.width, height: params.height } })
          }
        />
        <DualHandle id="top" position={Position.Top} className="device-node__handle" />
        {data.imageDataUrl ? (
          <img src={data.imageDataUrl} alt={data.label || 'Imagem'} className="device-node__image" />
        ) : (
          <div className="device-node__image device-node__image--placeholder" />
        )}
        {data.label && <div className="device-node__image-caption">{data.label}</div>}
        <DualHandle id="bottom" position={Position.Bottom} className="device-node__handle" />
      </div>
    )
  }

  const Icon = (data.icon && DEVICE_ICONS[data.icon]) || config.icon
  const [from, to] = data.color ? gradientFromColor(data.color) : config.gradient
  const accent = data.color ?? config.color
  const vlanCount = data.metadata.vlanIds?.length ?? 0

  return (
    <div
      className={`device-node${selected ? ' device-node--selected' : ''}`}
      style={{
        ['--accent' as string]: accent,
        ['--accent-2' as string]: to,
        ...(data.size ?? {})
      }}
    >
      <NodeResizer
        isVisible={selected}
        minWidth={MIN_SIZE.width}
        minHeight={MIN_SIZE.height}
        // Same reasoning as the image node above: the left/right resize lines
        // sit exactly on top of the left/right connection Handles (both at
        // top:50%) while the node is selected, which is exactly when a user
        // is most likely to try dragging a connection from a handle they just
        // clicked to select. Corner handles still resize the node fine.
        lineStyle={{ pointerEvents: 'none' }}
        onResizeEnd={(_e, params) => updateDevice(id, { size: { width: params.width, height: params.height } })}
      />
      <DualHandle id="top" position={Position.Top} className="device-node__handle" />
      <div className="device-node__row" style={{ fontSize: data.fontSize ? `${data.fontSize}px` : undefined }}>
        <div className="device-node__icon" style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}>
          <Icon size={21} color="#fff" weight="duotone" />
        </div>
        <div className="device-node__text">
          <div className="device-node__label">{data.label}</div>
          <div className="device-node__sub">{data.vendorModel || config.label}</div>
        </div>
      </div>
      {(data.metadata.ip || data.metadata.ports || vlanCount > 0) && (
        <div className="device-node__chips">
          {data.metadata.ip && (
            <span className="chip">
              <Router size={10} /> {data.metadata.ip}
            </span>
          )}
          {typeof data.metadata.ports === 'number' && <span className="chip">{data.metadata.ports}p</span>}
          {vlanCount > 0 && <span className="chip chip--vlan">{vlanCount} VLAN{vlanCount > 1 ? 's' : ''}</span>}
        </div>
      )}
      <DualHandle id="bottom" position={Position.Bottom} className="device-node__handle" />
      <DualHandle id="left" position={Position.Left} className="device-node__handle" />
      <DualHandle id="right" position={Position.Right} className="device-node__handle" />
    </div>
  )
}
