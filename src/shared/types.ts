// The LLM only ever generates the first 8 — everything after 'generic' is a
// manual-only, user-added canvas element (see LlmDeviceType in
// diagramSchema.ts, which excludes all of them) with no place in the network
// graph: no IP/VLAN metadata, no connections, excluded from auto-layout.
export type DeviceType =
  | 'server'
  | 'nas'
  | 'firewall'
  | 'switch'
  | 'ap'
  | 'client'
  | 'cloud'
  | 'generic'
  | 'image'
  | 'group'
  | 'rectangle'
  | 'ellipse'
  | 'line'
  | 'text'

/** Every manual-only, non-network-device type — the single source of truth
 * for "is this a real device" checks scattered across layout, audit, CSV
 * export, search, batch-edit, and the AI context builder. Add new decorative
 * shape types here, not to each of those call sites individually. */
export const DECORATIVE_TYPES: readonly DeviceType[] = [
  'image',
  'group',
  'rectangle',
  'ellipse',
  'line',
  'text'
]

export function isRealDevice(type: DeviceType): boolean {
  return !DECORATIVE_TYPES.includes(type)
}

export type ConnectionType = 'ethernet' | 'trunk' | 'vpn' | 'wireless'

export interface DeviceMetadata {
  ip?: string
  vlanIds?: number[]
  ports?: number
  notes?: string
}

export interface DeviceNodeData {
  // Index signature required so this satisfies React Flow's Node<T extends Record<string, unknown>> constraint.
  [key: string]: unknown
  id: string
  type: DeviceType
  label: string
  vendorModel?: string
  position: { x: number; y: number }
  metadata: DeviceMetadata
  /** Overrides the device type's default accent color when set. */
  color?: string
  /** Key into DEVICE_ICONS overriding the DeviceType's default icon (set when
   * placed from a specific palette preset, e.g. "Database" for a DB server). */
  icon?: string
  /** Label font size in px; sub-text scales proportionally. */
  fontSize?: number
  /** Manual card size from dragging the resize handles. */
  size?: { width: number; height: number }
  /** Only set when type === 'image': the embedded picture (data: URL). */
  imageDataUrl?: string
  /** Id of the 'group' node this device visually sits inside, if any — set by
   * dropping it onto a group frame. Drives React Flow's parentId (so the
   * device moves together with the group) and makes `position` relative to
   * the group instead of absolute. */
  groupId?: string
  /** Only meaningful for type === 'line': stroke thickness in px. */
  strokeWidth?: number
  /** Only meaningful for type === 'line': draws an arrowhead at the end. */
  arrow?: boolean
  /** Only meaningful for type === 'line': the two endpoints, relative to
   * `position` (so normal node dragging — which only moves `position` — keeps
   * the line's shape intact for free). Both coordinates may be negative;
   * `position`/`size` are kept normalized to their bounding box by whichever
   * code moves an endpoint. Absent on lines created before this field existed
   * (or still using the legacy width/height-only diagonal), which fall back
   * to a top-left-to-bottom-right diagonal derived from `size`. */
  points?: [{ x: number; y: number }, { x: number; y: number }]
}

export interface ConnectionEdgeData {
  [key: string]: unknown
  id: string
  source: string
  target: string
  /** Which of the node's handles this connects to — without it, React Flow can't tell
   * left/right from top/bottom and silently falls back to a default handle. */
  sourceHandle?: string | null
  targetHandle?: string | null
  type: ConnectionType
  label?: string
  vlanId?: number | null
}

export interface Vlan {
  id: number
  name: string
  color: string
  /** Gateway/network IP for this VLAN (e.g. "192.168.10.1") — a device that trunks
   * multiple VLANs can't have a single "ip" of its own, so per-network IPs live here. */
  ip?: string
}

export interface Diagram {
  version: 1
  devices: DeviceNodeData[]
  connections: ConnectionEdgeData[]
  vlans: Vlan[]
}

/** Sent alongside a generation request so the LLM knows what's already on the
 * canvas and can connect new devices to it instead of recreating duplicates. */
export interface ExistingDeviceSummary {
  id: string
  label: string
  type: DeviceType
}

export const DEFAULT_OLLAMA_HOST = 'http://localhost:11434'
export const DEFAULT_OLLAMA_MODEL = 'qwen2.5:7b'

export const RECOMMENDED_OLLAMA_MODELS = [
  'granite4.1:8b',
  'qwen2.5:7b',
  'qwen3.5:9b',
  'qwen3.5:4b',
  'llama3.1:8b',
  'llama3.2:3b'
] as const

export interface AppSettings {
  ollamaHost: string
  ollamaModel: string
}
