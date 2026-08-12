import type { Diagram, DeviceNodeData, ConnectionEdgeData, DeviceType } from '@shared/types'
import { deviceTypeConfig } from './deviceTypeConfig'

export type AuditSeverity = 'warning' | 'info'

export interface AuditFinding {
  id: string
  severity: AuditSeverity
  message: string
  /** Device ids this finding is about, for click-to-select in the UI. */
  deviceIds: string[]
}

const INFRA_TYPES: DeviceType[] = ['server', 'nas', 'firewall', 'switch', 'ap']
const SWITCH_LOAD_THRESHOLD = 8

function isLikelyVm(device: DeviceNodeData): boolean {
  if (device.vendorModel?.trim().toUpperCase() === 'VM') return true
  const notes = device.metadata.notes?.trim().toUpperCase()
  return !!notes && notes.split(/\s+/).includes('VM')
}

function otherEnd(connection: ConnectionEdgeData, deviceId: string): string {
  return connection.source === deviceId ? connection.target : connection.source
}

/**
 * Deterministic, rule-based "health check" over the current diagram — no AI
 * involved, so it's instant and always available regardless of whether
 * Ollama is running. Every rule only looks at graph structure (devices,
 * connections, VLANs) that's already on the canvas; nothing here tries to
 * infer intent from the original free-text prompt (that context isn't kept
 * once generation finishes), which is why rules like "no VLAN" or "no
 * backup" aren't included — they'd need to know what the user asked for to
 * avoid constant false positives.
 */
export function auditDiagram(diagram: Diagram): AuditFinding[] {
  const findings: AuditFinding[] = []
  const devices = diagram.devices.filter((d) => d.type !== 'image' && d.type !== 'group')
  const deviceById = new Map(devices.map((d) => [d.id, d]))
  const connections = diagram.connections

  const connectionsByDevice = new Map<string, ConnectionEdgeData[]>()
  for (const c of connections) {
    if (!deviceById.has(c.source) && !deviceById.has(c.target)) continue
    connectionsByDevice.set(c.source, [...(connectionsByDevice.get(c.source) ?? []), c])
    connectionsByDevice.set(c.target, [...(connectionsByDevice.get(c.target) ?? []), c])
  }

  // Isolated devices — not connected to anything at all.
  for (const d of devices) {
    if (!connectionsByDevice.has(d.id)) {
      findings.push({
        id: `isolated-${d.id}`,
        severity: 'warning',
        message: `"${d.label}" está isolado, sem nenhuma conexão no diagrama.`,
        deviceIds: [d.id]
      })
    }
  }

  // Duplicate IPs across devices.
  const byIp = new Map<string, DeviceNodeData[]>()
  for (const d of devices) {
    const ip = d.metadata.ip?.trim()
    if (!ip) continue
    byIp.set(ip, [...(byIp.get(ip) ?? []), d])
  }
  for (const [ip, list] of byIp) {
    if (list.length > 1) {
      findings.push({
        id: `dup-ip-${ip}`,
        severity: 'warning',
        message: `IP ${ip} repetido em ${list.map((d) => `"${d.label}"`).join(', ')}.`,
        deviceIds: list.map((d) => d.id)
      })
    }
  }

  // Infra-role devices with neither an IP nor a VLAN assigned.
  for (const d of devices) {
    if (!INFRA_TYPES.includes(d.type)) continue
    const hasIp = !!d.metadata.ip?.trim()
    const hasVlan = (d.metadata.vlanIds?.length ?? 0) > 0
    if (!hasIp && !hasVlan) {
      findings.push({
        id: `no-ip-${d.id}`,
        severity: 'info',
        message: `"${d.label}" (${deviceTypeConfig[d.type].label}) não tem IP nem VLAN definidos.`,
        deviceIds: [d.id]
      })
    }
  }

  // VLANs without a gateway IP.
  for (const v of diagram.vlans) {
    if (!v.ip?.trim()) {
      findings.push({
        id: `vlan-no-ip-${v.id}`,
        severity: 'info',
        message: `VLAN ${v.id} (${v.name}) não tem IP de gateway definido.`,
        deviceIds: []
      })
    }
  }

  // VLANs declared but never referenced by any device or connection.
  const usedVlanIds = new Set<number>()
  for (const d of devices) for (const vid of d.metadata.vlanIds ?? []) usedVlanIds.add(vid)
  for (const c of connections) if (c.vlanId != null) usedVlanIds.add(c.vlanId)
  for (const v of diagram.vlans) {
    if (!usedVlanIds.has(v.id)) {
      findings.push({
        id: `vlan-unused-${v.id}`,
        severity: 'info',
        message: `VLAN ${v.id} (${v.name}) foi declarada mas nenhum dispositivo ou conexão a usa.`,
        deviceIds: []
      })
    }
  }

  // VMs wired directly to a switch/firewall instead of to their host server.
  const flaggedVmPairs = new Set<string>()
  for (const c of connections) {
    const source = deviceById.get(c.source)
    const target = deviceById.get(c.target)
    if (!source || !target) continue
    for (const [vm, other] of [
      [source, target],
      [target, source]
    ] as [DeviceNodeData, DeviceNodeData][]) {
      if (!isLikelyVm(vm) || (other.type !== 'switch' && other.type !== 'firewall')) continue
      const pairKey = [vm.id, other.id].sort().join('-')
      if (flaggedVmPairs.has(pairKey)) continue
      flaggedVmPairs.add(pairKey)
      findings.push({
        id: `vm-direct-${pairKey}`,
        severity: 'warning',
        message: `"${vm.label}" (VM) está conectada direto a "${other.label}" (${deviceTypeConfig[other.type].label}) — o normal é conectar ao servidor host, não direto na rede.`,
        deviceIds: [vm.id, other.id]
      })
    }
  }

  // Switches carrying a lot of traffic through a single (non-redundant) uplink.
  for (const d of devices) {
    if (d.type !== 'switch') continue
    const deviceConnections = connectionsByDevice.get(d.id) ?? []
    if (deviceConnections.length < SWITCH_LOAD_THRESHOLD) continue
    const uplinks = deviceConnections.filter((c) => {
      const other = deviceById.get(otherEnd(c, d.id))
      return other && (other.type === 'switch' || other.type === 'firewall')
    })
    if (uplinks.length <= 1) {
      findings.push({
        id: `switch-spof-${d.id}`,
        severity: 'info',
        message: `"${d.label}" atende ${deviceConnections.length} conexões com apenas ${uplinks.length} link de uplink — ponto único de falha se ele cair.`,
        deviceIds: [d.id]
      })
    }
  }

  // No firewall has a visible internet/cloud uplink (checked diagram-wide, not
  // per-firewall, so branch-office topologies where only the HQ firewall has
  // the direct internet link don't get flagged for the branch firewall too).
  const firewalls = devices.filter((d) => d.type === 'firewall')
  if (firewalls.length > 0) {
    const anyFirewallHasCloudLink = firewalls.some((fw) =>
      (connectionsByDevice.get(fw.id) ?? []).some((c) => deviceById.get(otherEnd(c, fw.id))?.type === 'cloud')
    )
    if (!anyFirewallHasCloudLink) {
      findings.push({
        id: 'no-internet-link',
        severity: 'info',
        message: 'Nenhum firewall tem um link de internet/nuvem conectado diretamente.',
        deviceIds: firewalls.map((f) => f.id)
      })
    }
  }

  const severityWeight: Record<AuditSeverity, number> = { warning: 0, info: 1 }
  return findings.sort((a, b) => severityWeight[a.severity] - severityWeight[b.severity])
}
