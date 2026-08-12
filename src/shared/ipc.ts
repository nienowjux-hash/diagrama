import type { AppSettings, Diagram, ExistingDeviceSummary } from './types'
import type { LlmDiagram } from './diagramSchema'

export const IPC = {
  generateDiagram: 'diagram:generate',
  generateProgress: 'diagram:generateProgress',
  checkOllamaStatus: 'settings:checkOllamaStatus',
  getAppSettings: 'settings:get',
  setAppSettings: 'settings:set',
  saveDiagram: 'file:saveDiagram',
  loadDiagram: 'file:loadDiagram',
  exportFile: 'file:exportFile',
  setUnsavedChanges: 'app:setUnsavedChanges'
} as const

export interface GenerateDiagramResult {
  ok: true
  diagram: LlmDiagram
}

export interface GenerateDiagramError {
  ok: false
  errorCode: 'ollama_unreachable' | 'model_not_found' | 'network' | 'invalid_response' | 'unknown'
  message: string
}

export type GenerateDiagramResponse = GenerateDiagramResult | GenerateDiagramError

export interface OllamaStatus {
  reachable: boolean
  models: string[]
}

export interface SaveDiagramResult {
  ok: boolean
  filePath?: string
  canceled?: boolean
}

export interface LoadDiagramResult {
  ok: boolean
  diagram?: Diagram
  filePath?: string
  canceled?: boolean
  message?: string
}

export interface ExportFileResult {
  ok: boolean
  filePath?: string
  canceled?: boolean
}

export interface DiagramAPI {
  generateDiagram: (
    prompt: string,
    existingDevices: ExistingDeviceSummary[]
  ) => Promise<GenerateDiagramResponse>
  onGenerateProgress: (callback: (rawText: string) => void) => () => void
  checkOllamaStatus: () => Promise<OllamaStatus>
  getAppSettings: () => Promise<AppSettings>
  setAppSettings: (settings: Partial<AppSettings>) => Promise<AppSettings>
  saveDiagram: (diagram: Diagram, suggestedName?: string) => Promise<SaveDiagramResult>
  loadDiagram: () => Promise<LoadDiagramResult>
  exportFile: (
    dataUrl: string,
    suggestedName: string,
    filterLabel: string,
    extensions: string[]
  ) => Promise<ExportFileResult>
  /** Pushed proactively whenever the combined dirty state (active tab + any
   * background tab) changes, so the main process can warn before closing the
   * window without an async round-trip at close time. */
  setUnsavedChanges: (hasChanges: boolean) => void
}
