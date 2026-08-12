import { useEffect, useState } from 'react'
import { Sparkles, Loader2, History, X } from 'lucide-react'
import { useDiagramStore } from '../state/diagramStore'
import { parsePartialDiagram } from '../lib/partialDiagramParser'
import { findPotentialDuplicates, type DuplicateWarning } from '../lib/duplicateDetection'
import DuplicateWarningModal from './DuplicateWarningModal'
import type { ExistingDeviceSummary } from '@shared/types'
import type { LlmDiagram } from '@shared/diagramSchema'

const PROMPT_HISTORY_KEY = 'diagrama:promptHistory'
const PROMPT_HISTORY_LIMIT = 15

function loadPromptHistory(): string[] {
  try {
    const raw = localStorage.getItem(PROMPT_HISTORY_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((p) => typeof p === 'string') : []
  } catch {
    return []
  }
}

function savePromptHistory(history: string[]) {
  localStorage.setItem(PROMPT_HISTORY_KEY, JSON.stringify(history))
}

export default function PromptPanel({ onOpenSettings }: { onOpenSettings: () => void }) {
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<{ message: string; needsSettings: boolean } | null>(null)
  const [history, setHistory] = useState<string[]>([])
  const [historyOpen, setHistoryOpen] = useState(false)

  useEffect(() => {
    setHistory(loadPromptHistory())
  }, [])
  const beginGeneration = useDiagramStore((s) => s.beginGeneration)
  const applyPartialGeneratedDiagram = useDiagramStore((s) => s.applyPartialGeneratedDiagram)
  const applyGeneratedDiagram = useDiagramStore((s) => s.applyGeneratedDiagram)
  const undo = useDiagramStore((s) => s.undo)
  const [pendingDiagram, setPendingDiagram] = useState<LlmDiagram | null>(null)
  const [duplicateWarnings, setDuplicateWarnings] = useState<DuplicateWarning[]>([])

  function rememberPrompt(text: string) {
    const trimmed = text.trim()
    if (!trimmed) return
    const next = [trimmed, ...history.filter((p) => p !== trimmed)].slice(0, PROMPT_HISTORY_LIMIT)
    setHistory(next)
    savePromptHistory(next)
  }

  function removeHistoryEntry(text: string) {
    const next = history.filter((p) => p !== text)
    setHistory(next)
    savePromptHistory(next)
  }

  async function handleGenerate() {
    if (!description.trim() || loading) return

    setLoading(true)
    setError(null)
    setHistoryOpen(false)
    rememberPrompt(description)
    beginGeneration()

    const unsubscribe = window.diagramAPI.onGenerateProgress((rawText) => {
      const partial = parsePartialDiagram(rawText)
      if (partial) applyPartialGeneratedDiagram(partial)
    })

    const existingDevices: ExistingDeviceSummary[] = useDiagramStore
      .getState()
      .nodes.filter((n) => n.data.type !== 'image' && n.data.type !== 'group')
      .map((n) => ({ id: n.id, label: n.data.label, type: n.data.type }))

    try {
      const result = await window.diagramAPI.generateDiagram(description, existingDevices)
      if (!result.ok) {
        setError({
          message: result.message,
          needsSettings: result.errorCode === 'ollama_unreachable' || result.errorCode === 'model_not_found'
        })
        return
      }
      const duplicates = findPotentialDuplicates(existingDevices, result.diagram.devices)
      if (duplicates.length > 0) {
        setPendingDiagram(result.diagram)
        setDuplicateWarnings(duplicates)
      } else {
        applyGeneratedDiagram(result.diagram)
      }
    } finally {
      unsubscribe()
      setLoading(false)
    }
  }

  function handleKeepDuplicates() {
    if (pendingDiagram) applyGeneratedDiagram(pendingDiagram)
    setPendingDiagram(null)
    setDuplicateWarnings([])
  }

  function handleUndoDuplicates() {
    undo()
    setPendingDiagram(null)
    setDuplicateWarnings([])
  }

  return (
    <div className="prompt-panel">
      <div className="prompt-panel__title-row">
        <div className="prompt-panel__title">Descreva a infraestrutura</div>
        {history.length > 0 && (
          <button
            type="button"
            className="icon-button"
            title="Histórico de prompts"
            onClick={() => setHistoryOpen((v) => !v)}
          >
            <History size={14} />
          </button>
        )}
      </div>
      {historyOpen && (
        <div className="prompt-panel__history">
          {history.map((p) => (
            <div key={p} className="prompt-panel__history-item">
              <button
                type="button"
                className="prompt-panel__history-text"
                title={p}
                onClick={() => {
                  setDescription(p)
                  setHistoryOpen(false)
                }}
              >
                {p}
              </button>
              <button
                type="button"
                className="icon-button"
                title="Remover do histórico"
                onClick={() => removeHistoryEntry(p)}
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
      <textarea
        className="prompt-panel__textarea"
        rows={4}
        placeholder="ex: 2 servidores, 1 NAS, 1 pfSense, 4 Ubiquiti, 4 switches, VPN entre matriz e filial, VLANs de dados, voz e guest"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <button
        type="button"
        className="prompt-panel__button"
        onClick={handleGenerate}
        disabled={loading || !description.trim()}
      >
        {loading ? <Loader2 size={15} className="spin" /> : <Sparkles size={15} />}
        {loading ? 'Gerando ao vivo...' : 'Gerar diagrama'}
      </button>
      {error && (
        <div className="prompt-panel__error">
          {error.message}
          {' O que já apareceu no canvas foi mantido.'}
          {error.needsSettings && (
            <button type="button" className="link-button" onClick={onOpenSettings}>
              Abrir Configurações
            </button>
          )}
        </div>
      )}
      <div className="prompt-panel__hint">
        Cada geração é somada ao que já está no canvas — útil para montar em etapas.
        Use "Novo diagrama" na barra de ferramentas para começar do zero.
      </div>
      {duplicateWarnings.length > 0 && (
        <DuplicateWarningModal
          warnings={duplicateWarnings}
          onKeep={handleKeepDuplicates}
          onUndo={handleUndoDuplicates}
        />
      )}
    </div>
  )
}
