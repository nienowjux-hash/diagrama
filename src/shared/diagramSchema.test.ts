import { describe, it, expect } from 'vitest'
import { diagramSchema, llmDiagramSchema, deviceTypeSchema } from './diagramSchema'

describe('diagramSchema', () => {
  it('accepts a minimal valid diagram', () => {
    const result = diagramSchema.safeParse({ version: 1, devices: [], connections: [], vlans: [] })
    expect(result.success).toBe(true)
  })

  it('accepts a device with all optional fields, including group-related ones', () => {
    const result = diagramSchema.safeParse({
      version: 1,
      devices: [
        {
          id: '1',
          type: 'group',
          label: 'Rack 1',
          position: { x: 0, y: 0 },
          metadata: {},
          color: '#fff',
          size: { width: 100, height: 100 },
          groupId: undefined
        },
        {
          id: '2',
          type: 'server',
          label: 'Servidor',
          position: { x: 0, y: 0 },
          metadata: { ip: '10.0.0.1' },
          groupId: '1'
        }
      ],
      connections: [],
      vlans: []
    })
    expect(result.success).toBe(true)
  })

  it('rejects a device with an unknown type', () => {
    const result = diagramSchema.safeParse({
      version: 1,
      devices: [{ id: '1', type: 'not-a-real-type', label: 'x', position: { x: 0, y: 0 }, metadata: {} }],
      connections: [],
      vlans: []
    })
    expect(result.success).toBe(false)
  })

  it('rejects the wrong version literal', () => {
    const result = diagramSchema.safeParse({ version: 2, devices: [], connections: [], vlans: [] })
    expect(result.success).toBe(false)
  })
})

describe('deviceTypeSchema', () => {
  it('includes all manual-only decorative types alongside the 8 LLM-facing ones', () => {
    for (const type of ['image', 'group', 'rectangle', 'ellipse', 'line', 'text']) {
      expect(deviceTypeSchema.options).toContain(type)
    }
    expect(deviceTypeSchema.options).toHaveLength(14)
  })
})

describe('llmDiagramSchema', () => {
  it('rejects devices using the manual-only "image" or "group" types', () => {
    const result = llmDiagramSchema.safeParse({
      devices: [{ type: 'group', label: 'x', refId: 'a' }],
      connections: [],
      vlans: []
    })
    expect(result.success).toBe(false)
  })

  it('accepts a well-formed LLM response', () => {
    const result = llmDiagramSchema.safeParse({
      devices: [
        { type: 'firewall', label: 'Firewall', refId: 'fw-1' },
        { type: 'switch', label: 'Switch', refId: 'sw-1' }
      ],
      connections: [{ sourceRefId: 'fw-1', targetRefId: 'sw-1', type: 'ethernet' }],
      vlans: []
    })
    expect(result.success).toBe(true)
  })
})
