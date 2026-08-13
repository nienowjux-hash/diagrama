import { useRef, type PointerEvent } from 'react'
import { Handle, Position, NodeResizer, useReactFlow, type NodeProps, type Node } from '@xyflow/react'
import { Router } from 'lucide-react'
import type { DeviceNodeData } from '@shared/types'
import { deviceTypeConfig } from '../../lib/deviceTypeConfig'
import { DEVICE_ICONS } from '../../lib/deviceIcons'
import { gradientFromColor } from '../../lib/colorUtils'
import { useDiagramStore } from '../../state/diagramStore'

type DeviceNodeType = Node<DeviceNodeData>
type LinePoints = [{ x: number; y: number }, { x: number; y: number }]

/** Padding, in canvas px, added around a line's tight bounding box so the two
 * endpoint grab handles have room to render/be grabbed without clipping at
 * the wrapper div's edge. Purely a rendering concern — see the `points` doc
 * comment in shared/types.ts for the coordinate-frame invariant this relies on. */
const LINE_PAD = 16

function resolveLinePoints(data: DeviceNodeData): LinePoints {
  if (data.points) return data.points
  const w = data.size?.width ?? 160
  const h = data.size?.height ?? 2
  return [
    { x: 0, y: 0 },
    { x: w, y: h }
  ]
}

/**
 * Free-form line: unlike rectangle/ellipse/text, a line resized via
 * NodeResizer's 4 corner handles could only ever stretch a fixed top-left to
 * bottom-right diagonal — dragging a corner changed its length but could
 * never flip its direction (e.g. no way to reach an upward-sloping line from
 * a downward one), which read as "stuck"/static. This renders two
 * independently-draggable endpoint handles instead, each freely movable in
 * any direction; `updateDevice` keeps `points` (relative to `data.position`,
 * bounding-box-normalized so both coordinates stay >= 0) and `position` in
 * sync on every move — see the math in the pointermove handler below.
 */
function LineNode({ id, data, selected }: { id: string; data: DeviceNodeData; selected?: boolean }) {
  const updateDevice = useDiagramStore((s) => s.updateDevice)
  const { screenToFlowPosition } = useReactFlow()
  const dragRef = useRef<{
    index: 0 | 1
    startFlow: { x: number; y: number }
    startPoints: LinePoints
    startPosition: { x: number; y: number }
  } | null>(null)

  const points = resolveLinePoints(data)
  const stroke = data.color ?? deviceTypeConfig.line.color
  const strokeWidth = data.strokeWidth ?? 3
  const maxX = Math.max(points[0].x, points[1].x)
  const maxY = Math.max(points[0].y, points[1].y)
  const width = maxX + LINE_PAD * 2
  const height = maxY + LINE_PAD * 2
  const local: LinePoints = [
    { x: points[0].x + LINE_PAD, y: points[0].y + LINE_PAD },
    { x: points[1].x + LINE_PAD, y: points[1].y + LINE_PAD }
  ]
  const markerId = `line-arrow-${id}`

  const onEndpointPointerDown = (index: 0 | 1) => (e: PointerEvent<SVGCircleElement>) => {
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = {
      index,
      startFlow: screenToFlowPosition({ x: e.clientX, y: e.clientY }),
      startPoints: points,
      startPosition: data.position
    }
  }
  const onEndpointPointerMove = (e: PointerEvent<SVGCircleElement>) => {
    const drag = dragRef.current
    if (!drag) return
    e.stopPropagation()
    const current = screenToFlowPosition({ x: e.clientX, y: e.clientY })
    const dx = current.x - drag.startFlow.x
    const dy = current.y - drag.startFlow.y
    const moved: LinePoints = [{ ...drag.startPoints[0] }, { ...drag.startPoints[1] }]
    moved[drag.index] = {
      x: drag.startPoints[drag.index].x + dx,
      y: drag.startPoints[drag.index].y + dy
    }
    const minX = Math.min(moved[0].x, moved[1].x)
    const minY = Math.min(moved[0].y, moved[1].y)
    const normalized: LinePoints = [
      { x: moved[0].x - minX, y: moved[0].y - minY },
      { x: moved[1].x - minX, y: moved[1].y - minY }
    ]
    updateDevice(id, {
      position: { x: drag.startPosition.x + minX, y: drag.startPosition.y + minY },
      points: normalized,
      size: {
        width: Math.max(normalized[0].x, normalized[1].x),
        height: Math.max(normalized[0].y, normalized[1].y)
      }
    })
  }
  const onEndpointPointerUp = (e: PointerEvent<SVGCircleElement>) => {
    e.stopPropagation()
    dragRef.current = null
  }

  return (
    <div className={`shape-node--line-wrap${selected ? ' shape-node--selected' : ''}`} style={{ width, height }}>
      <svg className="shape-node__line-svg" width={width} height={height}>
        {data.arrow && (
          <defs>
            <marker id={markerId} markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 Z" fill={stroke} />
            </marker>
          </defs>
        )}
        <line
          x1={local[0].x}
          y1={local[0].y}
          x2={local[1].x}
          y2={local[1].y}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          markerEnd={data.arrow ? `url(#${markerId})` : undefined}
        />
        {selected &&
          local.map((p, index) => (
            <g key={index}>
              {/* Larger transparent circle as the actual pointer target — the
                  visible dot stays small/tidy, but grabbing an endpoint at
                  typical canvas zoom needs more forgiveness than its painted
                  radius alone would give (same reasoning as the enlarged
                  NodeResizer hit area in index.css). */}
              <circle
                className="shape-node__line-handle-hit nodrag nopan"
                cx={p.x}
                cy={p.y}
                r={12}
                fill="transparent"
                onPointerDown={onEndpointPointerDown(index as 0 | 1)}
                onPointerMove={onEndpointPointerMove}
                onPointerUp={onEndpointPointerUp}
              />
              <circle className="shape-node__line-handle" cx={p.x} cy={p.y} r={5} />
            </g>
          ))}
      </svg>
    </div>
  )
}

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

  if (data.type === 'rectangle' || data.type === 'ellipse') {
    const stroke = data.color ?? config.color
    return (
      <div
        className={`shape-node shape-node--${data.type}${selected ? ' shape-node--selected' : ''}`}
        style={{ ...(data.size ?? {}), ['--shape-color' as string]: stroke }}
      >
        <NodeResizer
          isVisible={selected}
          minWidth={40}
          minHeight={30}
          lineStyle={{ pointerEvents: 'none' }}
          onResizeEnd={(_e, params) => updateDevice(id, { size: { width: params.width, height: params.height } })}
        />
        {data.label && <div className="shape-node__label">{data.label}</div>}
      </div>
    )
  }

  if (data.type === 'line') {
    return <LineNode id={id} data={data} selected={selected} />
  }

  if (data.type === 'text') {
    return (
      <div
        className={`shape-node--text${selected ? ' shape-node--selected' : ''}`}
        style={{ ...(data.size ?? {}), color: data.color ?? config.color, fontSize: data.fontSize ?? 16 }}
      >
        <NodeResizer
          isVisible={selected}
          minWidth={30}
          minHeight={20}
          lineStyle={{ pointerEvents: 'none' }}
          onResizeEnd={(_e, params) => updateDevice(id, { size: { width: params.width, height: params.height } })}
        />
        {data.label || 'Texto'}
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
