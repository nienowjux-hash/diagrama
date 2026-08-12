import { z } from 'zod'
import { llmDiagramSchema } from '@shared/diagramSchema'

/**
 * JSON Schema passed as Ollama's `format` parameter to force structured output
 * matching llmDiagramSchema (Ollama's structured-output feature, not tool-calling,
 * since it works consistently across open models like Qwen2.5/Llama3.x).
 */
export const diagramJsonSchema = z.toJSONSchema(llmDiagramSchema)
