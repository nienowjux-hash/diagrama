import {
  Cloud,
  ShieldCheck,
  ShareNetwork,
  Plug,
  Network,
  WifiHigh,
  Broadcast,
  DesktopTower,
  Cube,
  Database,
  HardDrives,
  HardDrive,
  Monitor,
  Laptop,
  Printer,
  VideoCamera,
  Phone,
  BatteryCharging,
  Scales,
  Buildings,
  Cpu,
  Image,
  Stack,
  GitFork,
  Radio,
  Waveform,
  RadioButton,
  SimCard,
  Lightning,
  CubeTransparent,
  ShieldStar,
  Faders,
  Siren,
  Warehouse,
  Fingerprint,
  LockKey,
  CarBattery,
  Television,
  DeviceMobile,
  DeviceTablet,
  Globe,
  type Icon
} from '@phosphor-icons/react'

/**
 * Central registry of every icon a device node can render, keyed by a stable
 * string name. Presets store the key (not the component) on DeviceNodeData
 * so the specific icon picked in the palette (e.g. Database for "Banco de
 * Dados") survives onto the canvas node instead of falling back to the
 * underlying DeviceType's generic default icon.
 */
export const DEVICE_ICONS: Record<string, Icon> = {
  Cloud,
  ShieldCheck,
  ShareNetwork,
  Plug,
  Network,
  WifiHigh,
  Broadcast,
  DesktopTower,
  Cube,
  Database,
  HardDrives,
  HardDrive,
  Monitor,
  Laptop,
  Printer,
  VideoCamera,
  Phone,
  BatteryCharging,
  Scales,
  Buildings,
  Cpu,
  Image,
  Stack,
  GitFork,
  Radio,
  Waveform,
  RadioButton,
  SimCard,
  Lightning,
  CubeTransparent,
  ShieldStar,
  Faders,
  Siren,
  Warehouse,
  Fingerprint,
  LockKey,
  CarBattery,
  Television,
  DeviceMobile,
  DeviceTablet,
  Globe
}

/** Reverse lookup: given a DeviceType's default Icon component (from
 * deviceTypeConfig), find its registry key — lets code match a node with no
 * explicit `data.icon` override to the preset that visually represents it. */
export function iconKeyFor(icon: Icon): string | undefined {
  return Object.entries(DEVICE_ICONS).find(([, component]) => component === icon)?.[0]
}
