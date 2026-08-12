import { parse, Allow } from 'partial-json'
import type { ConnectionType, DeviceType } from '@shared/types'

export interface PartialDevice {
  refId: string
  type: DeviceType
  label: string
  vendorModel?: string
  ip?: string
  vlanIds?: number[]
  ports?: number
  notes?: string
}

export interface PartialConnection {
  sourceRefId: string
  targetRefId: string
  type: ConnectionType
  label?: string
  vlanId?: number | null
}

export interface PartialVlan {
  id: number
  name: string
  ip?: string
}

export interface ParsedPartialDiagram {
  devices: PartialDevice[]
  connections: PartialConnection[]
  vlans: PartialVlan[]
}

const DEVICE_TYPES = new Set<DeviceType>([
  'server',
  'nas',
  'firewall',
  'switch',
  'ap',
  'client',
  'cloud',
  'generic'
])

const CONNECTION_TYPES = new Set<ConnectionType>(['ethernet', 'trunk', 'vpn', 'wireless'])

/**
 * Best-effort parse of a (possibly truncated) JSON diagram being streamed
 * token-by-token. Only complete objects with the minimum required fields
 * are returned — an object still missing fields (because the model hasn't
 * streamed them yet) is simply left out until a later call includes it whole.
 */
export function parsePartialDiagram(text: string): ParsedPartialDiagram | null {
  let raw: unknown
  try {
    // Allow partial arrays/objects (so the outer wrapper and in-progress arrays
    // parse even before they're closed) but not partial strings/numbers, so a
    // half-streamed field value never gets truncated into a wrong-looking one.
    raw = parse(text, Allow.ARR | Allow.OBJ)
  } catch {
    return null
  }
  if (!raw || typeof raw !== 'object') return null
  const obj = raw as Record<string, unknown>

  const devices: PartialDevice[] = Array.isArray(obj.devices)
    ? obj.devices.filter(isCompleteDevice)
    : []
  const connections: PartialConnection[] = Array.isArray(obj.connections)
    ? obj.connections.filter(isCompleteConnection)
    : []
  const vlans: PartialVlan[] = Array.isArray(obj.vlans) ? obj.vlans.filter(isCompleteVlan) : []

  return { devices, connections, vlans }
}

function isCompleteDevice(d: unknown): d is PartialDevice {
  if (!d || typeof d !== 'object') return false
  const device = d as Record<string, unknown>
  return (
    typeof device.refId === 'string' &&
    device.refId.length > 0 &&
    typeof device.label === 'string' &&
    device.label.length > 0 &&
    typeof device.type === 'string' &&
    DEVICE_TYPES.has(device.type as DeviceType)
  )
}

function isCompleteConnection(c: unknown): c is PartialConnection {
  if (!c || typeof c !== 'object') return false
  const conn = c as Record<string, unknown>
  return (
    typeof conn.sourceRefId === 'string' &&
    conn.sourceRefId.length > 0 &&
    typeof conn.targetRefId === 'string' &&
    conn.targetRefId.length > 0 &&
    typeof conn.type === 'string' &&
    CONNECTION_TYPES.has(conn.type as ConnectionType)
  )
}

function isCompleteVlan(v: unknown): v is PartialVlan {
  if (!v || typeof v !== 'object') return false
  const vlan = v as Record<string, unknown>
  return typeof vlan.id === 'number' && typeof vlan.name === 'string' && vlan.name.length > 0
}
