import { describe, it, expect } from 'vitest'
import type { Diagram } from '@shared/types'
import { buildInventoryCsv } from './inventoryCsv'

function baseDiagram(overrides: Partial<Diagram> = {}): Diagram {
  return { version: 1, devices: [], connections: [], vlans: [], ...overrides }
}

describe('buildInventoryCsv', () => {
  it('lists a device with its metadata', () => {
    const csv = buildInventoryCsv(
      baseDiagram({
        devices: [
          {
            id: '1',
            type: 'server',
            label: 'Servidor AD',
            vendorModel: 'Dell R440',
            position: { x: 0, y: 0 },
            metadata: { ip: '192.168.1.10', ports: 2 }
          }
        ]
      })
    )
    expect(csv).toContain('Servidor AD;Servidor;Dell R440;192.168.1.10')
  })

  it('excludes image and group nodes from the inventory', () => {
    const csv = buildInventoryCsv(
      baseDiagram({
        devices: [
          { id: '1', type: 'image', label: '', position: { x: 0, y: 0 }, metadata: {} },
          { id: '2', type: 'group', label: 'Rack 1', position: { x: 0, y: 0 }, metadata: {} }
        ]
      })
    )
    expect(csv).not.toContain('Rack 1')
    const lines = csv.split('\r\n').filter((l) => l.trim().length > 0)
    expect(lines).toHaveLength(1) // just the header row
  })

  it('escapes fields containing the delimiter', () => {
    const csv = buildInventoryCsv(
      baseDiagram({
        devices: [
          {
            id: '1',
            type: 'server',
            label: 'Servidor',
            position: { x: 0, y: 0 },
            metadata: { notes: 'nota; com ponto e vírgula' }
          }
        ]
      })
    )
    expect(csv).toContain('"nota; com ponto e vírgula"')
  })

  it('appends a VLAN table when VLANs exist', () => {
    const csv = buildInventoryCsv(
      baseDiagram({ vlans: [{ id: 10, name: 'Dados', color: '#000', ip: '10.0.10.1' }] })
    )
    expect(csv).toContain('VLAN;Nome;IP')
    expect(csv).toContain('10;Dados;10.0.10.1')
  })
})
