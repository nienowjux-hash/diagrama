import { z } from 'zod'

// LLM-facing enum: excludes 'image', which is a manual-only canvas element the
// model should never try to generate.
export const llmDeviceTypeSchema = z.enum([
  'server',
  'nas',
  'firewall',
  'switch',
  'ap',
  'client',
  'cloud',
  'generic'
])

// General enum used for save/load and manual editing — a superset of the above.
export const deviceTypeSchema = z.enum([
  'server',
  'nas',
  'firewall',
  'switch',
  'ap',
  'client',
  'cloud',
  'generic',
  'image',
  'group',
  'rectangle',
  'ellipse',
  'line',
  'text'
])

export const connectionTypeSchema = z.enum(['ethernet', 'trunk', 'vpn', 'wireless'])

export const deviceMetadataSchema = z.object({
  ip: z.string().optional(),
  vlanIds: z.array(z.number().int()).optional(),
  ports: z.number().int().optional(),
  notes: z.string().optional()
})

export const deviceNodeSchema = z.object({
  id: z.string(),
  type: deviceTypeSchema,
  label: z.string(),
  vendorModel: z.string().optional(),
  position: z.object({ x: z.number(), y: z.number() }),
  metadata: deviceMetadataSchema,
  color: z.string().optional(),
  icon: z.string().optional(),
  fontSize: z.number().optional(),
  size: z.object({ width: z.number(), height: z.number() }).optional(),
  imageDataUrl: z.string().optional(),
  groupId: z.string().optional(),
  strokeWidth: z.number().optional(),
  arrow: z.boolean().optional()
})

export const connectionEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  sourceHandle: z.string().nullable().optional(),
  targetHandle: z.string().nullable().optional(),
  type: connectionTypeSchema,
  label: z.string().optional(),
  vlanId: z.number().int().nullable().optional()
})

export const vlanSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  color: z.string(),
  ip: z.string().optional()
})

export const diagramSchema = z.object({
  version: z.literal(1),
  devices: z.array(deviceNodeSchema),
  connections: z.array(connectionEdgeSchema),
  vlans: z.array(vlanSchema)
})

/**
 * Shape returned directly by the LLM tool call: no ids/positions/colors yet —
 * those are generated client-side (uuid) or computed (layout, vlan palette).
 */
export const llmDiagramSchema = z.object({
  devices: z.array(
    z.object({
      type: llmDeviceTypeSchema,
      label: z.string(),
      vendorModel: z.string().optional(),
      ip: z.string().optional(),
      vlanIds: z.array(z.number().int()).optional(),
      ports: z.number().int().optional(),
      notes: z.string().optional(),
      refId: z.string().describe('Temporary id used only to reference this device from connections[].')
    })
  ),
  connections: z.array(
    z.object({
      sourceRefId: z.string(),
      targetRefId: z.string(),
      type: connectionTypeSchema,
      label: z.string().optional(),
      vlanId: z.number().int().nullable().optional()
    })
  ),
  vlans: z.array(
    z.object({
      id: z.number().int(),
      name: z.string(),
      ip: z.string().optional().describe('Gateway/network IP for this VLAN, e.g. "192.168.10.1".')
    })
  )
})

export type LlmDiagram = z.infer<typeof llmDiagramSchema>
