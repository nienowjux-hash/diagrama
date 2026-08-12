import type { DeviceType } from '@shared/types'
import { deviceTypeConfig } from './deviceTypeConfig'
import { DEVICE_ICONS } from './deviceIcons'
import type { Icon } from '@phosphor-icons/react'

export interface DevicePreset {
  key: string
  type: DeviceType
  label: string
  vendorModel?: string
  /** Key into DEVICE_ICONS — also stored on the placed node's data.icon so the
   * canvas node keeps this specific icon instead of the DeviceType's default. */
  iconKey: string
}

/**
 * Richer palette than the 8 base DeviceTypes the LLM understands: each preset still
 * maps to one of those 8 (driving color/connections/LLM schema) but gets its own
 * icon + a pre-filled label/vendorModel, so manual placement has real variety without
 * touching the underlying data model or the LLM-facing schema at all.
 */
export const DEVICE_PRESETS: DevicePreset[] = [
  { key: 'wan', type: 'cloud', label: 'Internet / WAN', iconKey: 'Cloud' },
  { key: 'cloud-service', type: 'cloud', label: 'Nuvem (Azure/AWS/GCP)', iconKey: 'Cloud' },
  { key: 'firewall', type: 'firewall', label: 'Firewall', iconKey: 'ShieldCheck' },
  { key: 'router', type: 'generic', label: 'Roteador', vendorModel: 'Roteador', iconKey: 'ShareNetwork' },
  { key: 'modem', type: 'generic', label: 'Modem', vendorModel: 'Modem', iconKey: 'Plug' },
  { key: 'switch', type: 'switch', label: 'Switch', iconKey: 'Network' },
  { key: 'ap', type: 'ap', label: 'Access Point', iconKey: 'WifiHigh' },
  { key: 'repeater', type: 'ap', label: 'Repetidor Wi-Fi', vendorModel: 'Repetidor', iconKey: 'Broadcast' },
  { key: 'server', type: 'server', label: 'Servidor', iconKey: 'DesktopTower' },
  { key: 'vm', type: 'server', label: 'Servidor Virtual (VM)', vendorModel: 'VM', iconKey: 'Cube' },
  { key: 'database', type: 'server', label: 'Banco de Dados', vendorModel: 'Banco de Dados', iconKey: 'Database' },
  { key: 'nas', type: 'nas', label: 'NAS', iconKey: 'HardDrives' },
  { key: 'storage', type: 'nas', label: 'Storage / SAN', vendorModel: 'SAN', iconKey: 'HardDrive' },
  { key: 'client', type: 'client', label: 'Cliente', iconKey: 'Monitor' },
  { key: 'laptop', type: 'client', label: 'Notebook', vendorModel: 'Notebook', iconKey: 'Laptop' },
  { key: 'printer', type: 'generic', label: 'Impressora', vendorModel: 'Impressora', iconKey: 'Printer' },
  { key: 'camera', type: 'generic', label: 'Câmera CFTV', vendorModel: 'Câmera', iconKey: 'VideoCamera' },
  { key: 'voip', type: 'client', label: 'Telefone IP', vendorModel: 'VoIP', iconKey: 'Phone' },
  { key: 'ups', type: 'generic', label: 'Nobreak / UPS', vendorModel: 'UPS', iconKey: 'BatteryCharging' },
  {
    key: 'loadbalancer',
    type: 'generic',
    label: 'Balanceador de Carga',
    vendorModel: 'Load Balancer',
    iconKey: 'Scales'
  },
  { key: 'site', type: 'generic', label: 'Filial / Site', vendorModel: 'Site', iconKey: 'Buildings' },
  { key: 'generic', type: 'generic', label: 'Dispositivo genérico', iconKey: 'Cpu' }
]

export function presetColor(preset: DevicePreset): string {
  return deviceTypeConfig[preset.type].color
}

export function presetIcon(preset: DevicePreset): Icon {
  return DEVICE_ICONS[preset.iconKey] ?? deviceTypeConfig[preset.type].icon
}
