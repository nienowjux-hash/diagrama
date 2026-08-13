import { describe, it, expect } from 'vitest'
import type { Diagram, DeviceNodeData, ConnectionEdgeData, DeviceType } from '@shared/types'
import { auditDiagram } from './networkAudit'

let idCounter = 0
function device(type: DeviceType, overrides: Partial<DeviceNodeData> = {}): DeviceNodeData {
  idCounter += 1
  return {
    id: `d${idCounter}`,
    type,
    label: overrides.label ?? `${type}-${idCounter}`,
    position: { x: 0, y: 0 },
    metadata: {},
    ...overrides
  }
}

function connect(a: DeviceNodeData, b: DeviceNodeData, overrides: Partial<ConnectionEdgeData> = {}): ConnectionEdgeData {
  return { id: `${a.id}-${b.id}`, source: a.id, target: b.id, type: 'ethernet', vlanId: null, ...overrides }
}

function diagram(devices: DeviceNodeData[], connections: ConnectionEdgeData[], vlans: Diagram['vlans'] = []): Diagram {
  return { version: 1, devices, connections, vlans }
}

describe('auditDiagram', () => {
  it('returns no findings for a small, well-formed diagram', () => {
    const wan = device('cloud', { label: 'Internet' })
    const fw = device('firewall', { label: 'Firewall', metadata: { ip: '10.0.0.1' } })
    const sw = device('switch', { label: 'Switch', metadata: { ip: '10.0.0.2' } })
    const findings = auditDiagram(
      diagram([wan, fw, sw], [connect(wan, fw), connect(fw, sw)])
    )
    expect(findings).toHaveLength(0)
  })

  it('flags a device with no connections at all', () => {
    const orphan = device('server', { label: 'Órfão' })
    const findings = auditDiagram(diagram([orphan], []))
    expect(findings.some((f) => f.id === `isolated-${orphan.id}`)).toBe(true)
  })

  it('does not flag decorative nodes (image, group, drawing shapes) as isolated', () => {
    const img = device('image', { label: '' })
    const group = device('group', { label: 'Rack' })
    const rect = device('rectangle', { label: 'Caixa' })
    const ellipse = device('ellipse', { label: 'Bolha' })
    const line = device('line', { label: '' })
    const text = device('text', { label: 'Anotação' })
    const findings = auditDiagram(diagram([img, group, rect, ellipse, line, text], []))
    expect(findings).toHaveLength(0)
  })

  it('flags duplicate IPs across devices', () => {
    const a = device('server', { label: 'A', metadata: { ip: '10.0.0.5' } })
    const b = device('server', { label: 'B', metadata: { ip: '10.0.0.5' } })
    const sw = device('switch', { label: 'Switch', metadata: { ip: '10.0.0.1' } })
    const findings = auditDiagram(diagram([a, b, sw], [connect(sw, a), connect(sw, b)]))
    const dup = findings.find((f) => f.id.startsWith('dup-ip-'))
    expect(dup).toBeDefined()
    expect(dup!.deviceIds.sort()).toEqual([a.id, b.id].sort())
  })

  it('flags an infra device with neither IP nor VLAN', () => {
    const fw = device('firewall', { label: 'Firewall' })
    const sw = device('switch', { label: 'Switch', metadata: { ip: '10.0.0.1' } })
    const findings = auditDiagram(diagram([fw, sw], [connect(fw, sw)]))
    expect(findings.some((f) => f.id === `no-ip-${fw.id}`)).toBe(true)
  })

  it('does not flag an infra device that has a VLAN but no direct IP', () => {
    const ap = device('ap', { label: 'AP', metadata: { vlanIds: [10, 20] } })
    const sw = device('switch', { label: 'Switch', metadata: { ip: '10.0.0.1' } })
    const findings = auditDiagram(diagram([ap, sw], [connect(sw, ap)]))
    expect(findings.some((f) => f.id === `no-ip-${ap.id}`)).toBe(false)
  })

  it('flags a VLAN with no gateway IP', () => {
    const findings = auditDiagram(diagram([], [], [{ id: 10, name: 'Dados', color: '#000' }]))
    expect(findings.some((f) => f.id === 'vlan-no-ip-10')).toBe(true)
  })

  it('flags a VLAN nobody references', () => {
    const d = device('server', { label: 'S', metadata: { vlanIds: [20] } })
    const findings = auditDiagram(
      diagram([d], [], [
        { id: 20, name: 'Usada', color: '#000', ip: '10.0.20.1' },
        { id: 30, name: 'Não usada', color: '#000', ip: '10.0.30.1' }
      ])
    )
    expect(findings.some((f) => f.id === 'vlan-unused-30')).toBe(true)
    expect(findings.some((f) => f.id === 'vlan-unused-20')).toBe(false)
  })

  it('flags a VM connected directly to a switch', () => {
    const vm = device('server', { label: 'VM - AD', vendorModel: 'VM' })
    const sw = device('switch', { label: 'Switch', metadata: { ip: '10.0.0.1' } })
    const findings = auditDiagram(diagram([vm, sw], [connect(sw, vm)]))
    expect(findings.some((f) => f.id.startsWith('vm-direct-'))).toBe(true)
  })

  it('does not flag a VM connected to its host server', () => {
    const host = device('server', { label: 'Host Hyper-V' })
    const vm = device('server', { label: 'VM - AD', vendorModel: 'VM' })
    const findings = auditDiagram(diagram([host, vm], [connect(host, vm)]))
    expect(findings.some((f) => f.id.startsWith('vm-direct-'))).toBe(false)
  })

  it('flags an overloaded switch with only one uplink', () => {
    const sw = device('switch', { label: 'Switch', metadata: { ip: '10.0.0.1' } })
    const fw = device('firewall', { label: 'Firewall', metadata: { ip: '10.0.0.254' } })
    const clients = Array.from({ length: 8 }, (_, i) => device('client', { label: `PC${i}` }))
    const findings = auditDiagram(
      diagram([sw, fw, ...clients], [connect(fw, sw), ...clients.map((c) => connect(sw, c))])
    )
    expect(findings.some((f) => f.id === `switch-spof-${sw.id}`)).toBe(true)
  })

  it('does not flag a lightly-loaded switch', () => {
    const sw = device('switch', { label: 'Switch', metadata: { ip: '10.0.0.1' } })
    const fw = device('firewall', { label: 'Firewall', metadata: { ip: '10.0.0.254' } })
    const client = device('client', { label: 'PC' })
    const findings = auditDiagram(diagram([sw, fw, client], [connect(fw, sw), connect(sw, client)]))
    expect(findings.some((f) => f.id === `switch-spof-${sw.id}`)).toBe(false)
  })

  it('flags a firewall with no internet/cloud link anywhere in the diagram', () => {
    const fw = device('firewall', { label: 'Firewall', metadata: { ip: '10.0.0.1' } })
    const sw = device('switch', { label: 'Switch', metadata: { ip: '10.0.0.2' } })
    const findings = auditDiagram(diagram([fw, sw], [connect(fw, sw)]))
    expect(findings.some((f) => f.id === 'no-internet-link')).toBe(true)
  })

  it('does not flag a branch firewall when another firewall in the diagram has the internet link', () => {
    const wan = device('cloud', { label: 'Internet' })
    const hqFw = device('firewall', { label: 'Firewall Matriz', metadata: { ip: '10.0.0.1' } })
    const branchFw = device('firewall', { label: 'Firewall Filial', metadata: { ip: '10.1.0.1' } })
    const findings = auditDiagram(
      diagram([wan, hqFw, branchFw], [connect(wan, hqFw), connect(hqFw, branchFw, { type: 'vpn' })])
    )
    expect(findings.some((f) => f.id === 'no-internet-link')).toBe(false)
  })

  it('sorts warnings before info-level findings', () => {
    const orphan = device('server', { label: 'Órfão' })
    const fw = device('firewall', { label: 'Firewall' })
    const sw = device('switch', { label: 'Switch', metadata: { ip: '10.0.0.1' } })
    const findings = auditDiagram(diagram([orphan, fw, sw], [connect(fw, sw)]))
    const firstInfoIndex = findings.findIndex((f) => f.severity === 'info')
    const lastWarningIndex = findings.map((f) => f.severity).lastIndexOf('warning')
    expect(lastWarningIndex).toBeLessThan(firstInfoIndex === -1 ? Infinity : firstInfoIndex)
  })
})
