import { isRealDevice, type Diagram } from '@shared/types'
import { deviceTypeConfig } from './deviceTypeConfig'

function csvEscape(value: string): string {
  if (/[",\n;]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

function row(fields: (string | number | undefined)[]): string {
  return fields.map((f) => csvEscape(f === undefined || f === null ? '' : String(f))).join(';')
}

/** Builds a semicolon-separated CSV (better default for pt-BR Excel locales,
 * which treat ',' as the decimal separator) listing every device and VLAN. */
export function buildInventoryCsv(diagram: Diagram): string {
  const lines: string[] = []
  lines.push(row(['Nome', 'Tipo', 'Fabricante / Modelo', 'IP', 'VLANs', 'Portas', 'Notas']))
  for (const device of diagram.devices) {
    if (!isRealDevice(device.type)) continue
    lines.push(
      row([
        device.label,
        deviceTypeConfig[device.type]?.label ?? device.type,
        device.vendorModel,
        device.metadata.ip,
        device.metadata.vlanIds?.join(', '),
        device.metadata.ports,
        device.metadata.notes
      ])
    )
  }

  if (diagram.vlans.length > 0) {
    lines.push('')
    lines.push(row(['VLAN', 'Nome', 'IP']))
    for (const vlan of diagram.vlans) {
      lines.push(row([vlan.id, vlan.name, vlan.ip]))
    }
  }

  // BOM so Excel opens the accented pt-BR text as UTF-8 instead of guessing wrong.
  return '﻿' + lines.join('\r\n')
}
