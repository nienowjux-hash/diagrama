import { llmDiagramSchema } from '@shared/diagramSchema'
import type { LlmDiagram } from '@shared/diagramSchema'
import type { ExistingDeviceSummary } from '@shared/types'
import { getAppSettings } from '../settings/appSettings'
import { diagramJsonSchema } from './diagramJsonSchema'
import { SYSTEM_PROMPT, buildUserPrompt } from './prompt'
import type { GenerateDiagramResponse, OllamaStatus } from '@shared/ipc'

interface OllamaChatChunk {
  message?: { role: string; content: string }
  done?: boolean
  error?: string
}

const CHUNK_THROTTLE_MS = 150

export async function generateDiagram(
  description: string,
  existingDevices: ExistingDeviceSummary[],
  onChunk?: (accumulatedText: string) => void
): Promise<GenerateDiagramResponse> {
  const { ollamaHost, ollamaModel } = getAppSettings()

  let res: Response
  try {
    res = await fetch(`${ollamaHost}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: ollamaModel,
        stream: true,
        format: diagramJsonSchema,
        // Disable extended "thinking" on reasoning-capable models (e.g. qwen3.5): for
        // this fast structured-extraction task it only burns the token budget on a long
        // internal monologue and can starve the actual JSON answer out of num_predict
        // entirely. Ollama ignores this option on models that don't support it.
        think: false,
        options: { temperature: 0.15, num_ctx: 8192, num_predict: 6144 },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: buildUserPrompt(description, existingDevices) }
        ]
      })
    })
  } catch {
    return {
      ok: false,
      errorCode: 'ollama_unreachable',
      message: `Nao foi possivel conectar ao Ollama em ${ollamaHost}. Verifique se o Ollama esta instalado e em execucao.`
    }
  }

  if (res.status === 404) {
    return {
      ok: false,
      errorCode: 'model_not_found',
      message: `O modelo "${ollamaModel}" nao foi encontrado no Ollama. Rode "ollama pull ${ollamaModel}" e tente novamente.`
    }
  }

  if (!res.ok || !res.body) {
    let detail = ''
    try {
      detail = ((await res.json()) as OllamaChatChunk).error ?? ''
    } catch {
      // ignore parse failure, use generic message below
    }
    return {
      ok: false,
      errorCode: 'network',
      message: `Falha ao contatar o Ollama (HTTP ${res.status}). ${detail}`.trim()
    }
  }

  let content = ''
  let lastEmit = 0
  let lineBuffer = ''
  const reader = res.body.getReader()
  const decoder = new TextDecoder()

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      lineBuffer += decoder.decode(value, { stream: true })
      const lines = lineBuffer.split('\n')
      lineBuffer = lines.pop() ?? ''

      for (const line of lines) {
        if (!line.trim()) continue
        let chunk: OllamaChatChunk
        try {
          chunk = JSON.parse(line)
        } catch {
          continue
        }
        if (chunk.error) {
          return { ok: false, errorCode: 'network', message: `Erro do Ollama: ${chunk.error}` }
        }
        if (chunk.message?.content) {
          content += chunk.message.content
          const now = Date.now()
          if (onChunk && now - lastEmit > CHUNK_THROTTLE_MS) {
            onChunk(content)
            lastEmit = now
          }
        }
      }
    }
  } catch {
    return {
      ok: false,
      errorCode: 'network',
      message: 'A conexao com o Ollama foi interrompida durante a geracao. Tente novamente.'
    }
  }

  onChunk?.(content)

  if (!content) {
    return {
      ok: false,
      errorCode: 'invalid_response',
      message:
        'O modelo local nao retornou um diagrama estruturado (respondeu vazio). Tente novamente, reformule a descricao, ou troque de modelo nas Configuracoes.'
    }
  }

  let rawJson: unknown
  try {
    rawJson = JSON.parse(content)
  } catch {
    return {
      ok: false,
      errorCode: 'invalid_response',
      message: 'A resposta do modelo local nao era um JSON valido. Tente novamente, ou reduza a complexidade do pedido.'
    }
  }

  const parsed = llmDiagramSchema.safeParse(rawJson)
  if (!parsed.success) {
    return {
      ok: false,
      errorCode: 'invalid_response',
      message: 'A resposta do modelo nao correspondeu ao formato esperado. Tente reformular a descricao ou reduzir a complexidade do pedido.'
    }
  }

  const existingIds = new Set(existingDevices.map((d) => d.id))
  const repaired = repairConnectivity(parsed.data, existingIds)
  return { ok: true, diagram: stripUnrequestedVlans(repaired, description) }
}

/**
 * Local models frequently invent VLANs even when explicitly told not to (a negative
 * instruction small models are unreliable at following). Rather than keep tuning the
 * prompt and hoping, enforce it deterministically: if the user's own description never
 * mentions "vlan", strip whatever the model made up.
 */
function stripUnrequestedVlans(diagram: LlmDiagram, description: string): LlmDiagram {
  if (description.toLowerCase().includes('vlan')) return diagram
  return {
    ...diagram,
    vlans: [],
    devices: diagram.devices.map((d) => ({ ...d, vlanIds: undefined })),
    connections: diagram.connections.map((c) => ({ ...c, vlanId: undefined }))
  }
}

// Preferred "hub" device types when picking which node bridges two disconnected
// clusters back together — lower is more likely to be a real network attachment
// point. Switches rank above firewalls: in practice stray devices (a NAS, a server)
// plug into a switch, not straight into the firewall.
const HUB_TYPE_PRIORITY: Record<string, number> = {
  switch: 0,
  firewall: 1,
  cloud: 2,
  nas: 3,
  server: 4,
  ap: 5,
  client: 6,
  generic: 7
}

/**
 * Local models occasionally produce a diagram made of two or more disconnected
 * clusters (e.g. the server/switch group and the firewall/internet group never get
 * a connection between them), even when explicitly instructed that everything must
 * form a single connected topology. Rather than keep hoping the prompt is obeyed,
 * detect any leftover disconnected clusters after generation and bridge them
 * deterministically by linking each cluster's most "hub-like" device to the main one.
 *
 * `existingIds` are devices already on the canvas from a previous generation (see
 * ExistingDeviceSummary): a new-response cluster that already links to one of those
 * is left alone — it's already tied into the real diagram, no bridge needed.
 */
function repairConnectivity(diagram: LlmDiagram, existingIds: Set<string>): LlmDiagram {
  if (diagram.devices.length < 2) return diagram

  const adjacency = new Map<string, Set<string>>()
  for (const d of diagram.devices) adjacency.set(d.refId, new Set())
  const linksToExisting = new Set<string>()
  for (const c of diagram.connections) {
    const sourceIsExisting = existingIds.has(c.sourceRefId)
    const targetIsExisting = existingIds.has(c.targetRefId)
    if (sourceIsExisting && adjacency.has(c.targetRefId)) linksToExisting.add(c.targetRefId)
    if (targetIsExisting && adjacency.has(c.sourceRefId)) linksToExisting.add(c.sourceRefId)
    if (adjacency.has(c.sourceRefId) && adjacency.has(c.targetRefId)) {
      adjacency.get(c.sourceRefId)!.add(c.targetRefId)
      adjacency.get(c.targetRefId)!.add(c.sourceRefId)
    }
  }

  const visited = new Set<string>()
  const components: string[][] = []
  for (const d of diagram.devices) {
    if (visited.has(d.refId)) continue
    const component: string[] = []
    const stack = [d.refId]
    visited.add(d.refId)
    while (stack.length > 0) {
      const current = stack.pop()!
      component.push(current)
      for (const neighbor of adjacency.get(current)!) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor)
          stack.push(neighbor)
        }
      }
    }
    components.push(component)
  }

  // A component that already touches the existing canvas doesn't need bridging —
  // only components fully isolated from both the existing canvas AND each other do.
  const needsBridging = components.filter((c) => !c.some((refId) => linksToExisting.has(refId)))
  if (needsBridging.length <= 1) return diagram

  const deviceByRefId = new Map(diagram.devices.map((d) => [d.refId, d]))
  const bestHub = (refIds: string[]): string =>
    [...refIds].sort(
      (a, b) =>
        (HUB_TYPE_PRIORITY[deviceByRefId.get(a)!.type] ?? 9) -
        (HUB_TYPE_PRIORITY[deviceByRefId.get(b)!.type] ?? 9)
    )[0]

  const mainHub = bestHub(needsBridging[0])
  const bridgeConnections = needsBridging.slice(1).map((component) => ({
    sourceRefId: mainHub,
    targetRefId: bestHub(component),
    type: 'ethernet' as const
  }))

  return { ...diagram, connections: [...diagram.connections, ...bridgeConnections] }
}

export async function checkOllamaStatus(): Promise<OllamaStatus> {
  const { ollamaHost } = getAppSettings()
  try {
    const res = await fetch(`${ollamaHost}/api/tags`)
    if (!res.ok) return { reachable: false, models: [] }
    const body = (await res.json()) as { models?: { name: string }[] }
    return { reachable: true, models: (body.models ?? []).map((m) => m.name) }
  } catch {
    return { reachable: false, models: [] }
  }
}
