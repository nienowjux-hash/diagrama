import { v4 as uuid } from 'uuid'
import type { Diagram, DeviceNodeData, ConnectionEdgeData, DeviceType, ConnectionType } from '@shared/types'

interface TplDevice {
  key: string
  type: DeviceType
  label: string
  vendorModel?: string
  ip?: string
  notes?: string
}

interface TplConnection {
  from: string
  to: string
  type: ConnectionType
  label?: string
}

function buildDiagram(devices: TplDevice[], connections: TplConnection[]): Diagram {
  const idOf = new Map<string, string>()
  const deviceData: DeviceNodeData[] = devices.map((d) => {
    const id = uuid()
    idOf.set(d.key, id)
    return {
      id,
      type: d.type,
      label: d.label,
      vendorModel: d.vendorModel,
      position: { x: 0, y: 0 },
      metadata: { ip: d.ip, notes: d.notes }
    }
  })
  const connectionData: ConnectionEdgeData[] = connections.map((c) => ({
    id: uuid(),
    source: idOf.get(c.from)!,
    target: idOf.get(c.to)!,
    type: c.type,
    label: c.label,
    vlanId: null
  }))
  return { version: 1, devices: deviceData, connections: connectionData, vlans: [] }
}

export interface DiagramTemplate {
  key: string
  name: string
  description: string
  build: () => Diagram
}

export const DIAGRAM_TEMPLATES: DiagramTemplate[] = [
  {
    key: 'small-office',
    name: 'Rede pequena',
    description: 'Internet, firewall, switch, servidor de arquivos e estações.',
    build: () =>
      buildDiagram(
        [
          { key: 'wan', type: 'cloud', label: 'Internet / WAN' },
          { key: 'fw', type: 'firewall', label: 'Firewall' },
          { key: 'sw', type: 'switch', label: 'Switch 24P' },
          { key: 'srv', type: 'server', label: 'Servidor de Arquivos', ip: '192.168.1.10' },
          { key: 'pc1', type: 'client', label: 'Estação 1' },
          { key: 'pc2', type: 'client', label: 'Estação 2' }
        ],
        [
          { from: 'wan', to: 'fw', type: 'ethernet' },
          { from: 'fw', to: 'sw', type: 'ethernet' },
          { from: 'sw', to: 'srv', type: 'ethernet' },
          { from: 'sw', to: 'pc1', type: 'ethernet' },
          { from: 'sw', to: 'pc2', type: 'ethernet' }
        ]
      )
  },
  {
    key: 'branch-vpn',
    name: 'Matriz + Filial (VPN)',
    description: 'Dois sites, cada um com firewall/switch próprios, ligados por VPN site-to-site.',
    build: () =>
      buildDiagram(
        [
          { key: 'wanA', type: 'cloud', label: 'Internet - Matriz' },
          { key: 'fwA', type: 'firewall', label: 'Firewall Matriz' },
          { key: 'swA', type: 'switch', label: 'Switch Matriz' },
          { key: 'srvA', type: 'server', label: 'Servidor Matriz' },
          { key: 'wanB', type: 'cloud', label: 'Internet - Filial' },
          { key: 'fwB', type: 'firewall', label: 'Firewall Filial' },
          { key: 'swB', type: 'switch', label: 'Switch Filial' },
          { key: 'pcB', type: 'client', label: 'Estação Filial' }
        ],
        [
          { from: 'wanA', to: 'fwA', type: 'ethernet' },
          { from: 'fwA', to: 'swA', type: 'ethernet' },
          { from: 'swA', to: 'srvA', type: 'ethernet' },
          { from: 'wanB', to: 'fwB', type: 'ethernet' },
          { from: 'fwB', to: 'swB', type: 'ethernet' },
          { from: 'swB', to: 'pcB', type: 'ethernet' },
          { from: 'fwA', to: 'fwB', type: 'vpn', label: 'VPN Site-to-Site' }
        ]
      )
  },
  {
    key: 'hyperv-backup',
    name: 'Servidor com VMs + Backup',
    description: 'Host Hyper-V com VMs (AD, banco de dados, proxy de backup), NAS local e backup em nuvem.',
    build: () =>
      buildDiagram(
        [
          { key: 'wan', type: 'cloud', label: 'Internet / WAN' },
          { key: 'fw', type: 'firewall', label: 'Firewall' },
          { key: 'sw', type: 'switch', label: 'Switch 24P' },
          { key: 'ap', type: 'ap', label: 'Access Point' },
          { key: 'host', type: 'server', label: 'Servidor Hyper-V', notes: 'Host de virtualização' },
          { key: 'vmAD', type: 'server', label: 'VM - AD', vendorModel: 'Windows Server', notes: 'VM' },
          { key: 'vmDB', type: 'server', label: 'VM - Banco de Dados', vendorModel: 'Linux', notes: 'VM' },
          { key: 'vmBackup', type: 'server', label: 'VM - Proxy de Backup', vendorModel: 'Veeam', notes: 'VM' },
          { key: 'nas', type: 'nas', label: 'NAS Backup 8TB' },
          { key: 'cloudBackup', type: 'cloud', label: 'Backup em Nuvem (Azure)' }
        ],
        [
          { from: 'wan', to: 'fw', type: 'ethernet' },
          { from: 'fw', to: 'sw', type: 'ethernet' },
          { from: 'sw', to: 'ap', type: 'ethernet' },
          { from: 'sw', to: 'host', type: 'ethernet' },
          { from: 'host', to: 'vmAD', type: 'ethernet' },
          { from: 'host', to: 'vmDB', type: 'ethernet' },
          { from: 'host', to: 'vmBackup', type: 'ethernet' },
          { from: 'vmBackup', to: 'nas', type: 'ethernet' },
          { from: 'fw', to: 'cloudBackup', type: 'vpn', label: 'Backup via VPN' }
        ]
      )
  }
]
