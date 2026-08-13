import {
  DesktopTower,
  HardDrives,
  ShieldCheck,
  Network,
  WifiHigh,
  Monitor,
  Cloud,
  Cpu,
  Image,
  SquaresFour,
  Square,
  Circle,
  LineSegment,
  TextT,
  type Icon
} from '@phosphor-icons/react'
import type { DeviceType } from '@shared/types'

export interface DeviceTypeConfig {
  icon: Icon
  color: string
  gradient: [string, string]
  label: string
}

export const deviceTypeConfig: Record<DeviceType, DeviceTypeConfig> = {
  server: { icon: DesktopTower, color: '#3b82f6', gradient: ['#60a5fa', '#2563eb'], label: 'Servidor' },
  nas: { icon: HardDrives, color: '#6366f1', gradient: ['#818cf8', '#4f46e5'], label: 'NAS' },
  firewall: { icon: ShieldCheck, color: '#ef4444', gradient: ['#f87171', '#dc2626'], label: 'Firewall' },
  switch: { icon: Network, color: '#64748b', gradient: ['#94a3b8', '#475569'], label: 'Switch' },
  ap: { icon: WifiHigh, color: '#22c55e', gradient: ['#4ade80', '#16a34a'], label: 'Access Point' },
  client: { icon: Monitor, color: '#64748b', gradient: ['#94a3b8', '#334155'], label: 'Cliente' },
  cloud: { icon: Cloud, color: '#38bdf8', gradient: ['#7dd3fc', '#0284c7'], label: 'Internet / WAN' },
  generic: { icon: Cpu, color: '#a1a1aa', gradient: ['#d4d4d8', '#71717a'], label: 'Dispositivo' },
  image: { icon: Image, color: '#94a3b8', gradient: ['#cbd5e1', '#64748b'], label: 'Imagem' },
  group: { icon: SquaresFour, color: '#94a3b8', gradient: ['#cbd5e1', '#64748b'], label: 'Grupo' },
  rectangle: { icon: Square, color: '#64748b', gradient: ['#94a3b8', '#475569'], label: 'Retângulo' },
  ellipse: { icon: Circle, color: '#64748b', gradient: ['#94a3b8', '#475569'], label: 'Elipse' },
  line: { icon: LineSegment, color: '#64748b', gradient: ['#94a3b8', '#475569'], label: 'Linha' },
  text: { icon: TextT, color: '#e2e8f0', gradient: ['#f1f5f9', '#cbd5e1'], label: 'Texto' }
}

export const DEVICE_TYPE_ORDER: DeviceType[] = [
  'cloud',
  'firewall',
  'switch',
  'ap',
  'server',
  'nas',
  'client',
  'generic'
]
