import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, RefreshCw } from 'lucide-react'
import { RECOMMENDED_OLLAMA_MODELS } from '@shared/types'
import type { OllamaStatus } from '@shared/ipc'
import {
  useUiPreferencesStore,
  type ThemePreference,
  type GridVariant
} from '../state/uiPreferencesStore'

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'Automático (segue o Windows)' },
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Escuro' }
]

const GRID_OPTIONS: { value: GridVariant; label: string }[] = [
  { value: 'dots', label: 'Pontos' },
  { value: 'lines', label: 'Linhas' },
  { value: 'cross', label: 'Cruzes' },
  { value: 'none', label: 'Nenhuma' }
]

export default function SettingsModal({ onClose }: { onClose: () => void }) {
  const [host, setHost] = useState('')
  const [model, setModel] = useState('')
  const [status, setStatus] = useState<OllamaStatus | null>(null)
  const [checking, setChecking] = useState(false)
  const theme = useUiPreferencesStore((s) => s.theme)
  const setTheme = useUiPreferencesStore((s) => s.setTheme)
  const gridVariant = useUiPreferencesStore((s) => s.gridVariant)
  const setGridVariant = useUiPreferencesStore((s) => s.setGridVariant)
  const gridGap = useUiPreferencesStore((s) => s.gridGap)
  const setGridGap = useUiPreferencesStore((s) => s.setGridGap)

  useEffect(() => {
    window.diagramAPI.getAppSettings().then((s) => {
      setHost(s.ollamaHost)
      setModel(s.ollamaModel)
    })
    refreshStatus()
  }, [])

  async function refreshStatus() {
    setChecking(true)
    try {
      setStatus(await window.diagramAPI.checkOllamaStatus())
    } finally {
      setChecking(false)
    }
  }

  async function handleHostBlur() {
    await window.diagramAPI.setAppSettings({ ollamaHost: host })
    refreshStatus()
  }

  async function handleModelChange(next: string) {
    setModel(next)
    await window.diagramAPI.setAppSettings({ ollamaModel: next })
  }

  const availableModels = status?.models ?? []
  const modelOptions = Array.from(new Set([...availableModels, ...RECOMMENDED_OLLAMA_MODELS, model].filter(Boolean)))

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <span>Configurações</span>
          <button type="button" className="icon-button" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="modal__body">
          <label className="field">
            <span>Endereço do Ollama</span>
            <input value={host} onChange={(e) => setHost(e.target.value)} onBlur={handleHostBlur} />
          </label>

          <div className={`status-dot ${status?.reachable ? 'status-dot--ok' : 'status-dot--off'}`}>
            {checking
              ? 'Verificando...'
              : status?.reachable
                ? `Ollama conectado (${availableModels.length} modelo(s) instalado(s))`
                : 'Ollama não está rodando nesse endereço'}
            <button type="button" className="link-button" onClick={refreshStatus} style={{ marginLeft: 8 }}>
              <RefreshCw size={11} style={{ verticalAlign: 'middle' }} /> atualizar
            </button>
          </div>

          <label className="field" style={{ marginTop: 16 }}>
            <span>Modelo</span>
            <select value={model} onChange={(e) => handleModelChange(e.target.value)}>
              {modelOptions.map((m) => (
                <option key={m} value={m}>
                  {m}
                  {availableModels.includes(m) ? ' (instalado)' : ''}
                </option>
              ))}
            </select>
          </label>

          {status?.reachable && !availableModels.includes(model) && (
            <div className="modal__status">
              Esse modelo ainda não foi baixado. Rode no terminal: <code>ollama pull {model}</code>
            </div>
          )}

          {!status?.reachable && !checking && (
            <div className="modal__status">
              Instale o Ollama em ollama.com e deixe-o em execução para gerar diagramas automaticamente
              (a edição manual do diagrama continua funcionando normalmente sem ele).
            </div>
          )}

          <div className="modal__section-title">Aparência</div>

          <label className="field">
            <span>Tema</span>
            <select value={theme} onChange={(e) => setTheme(e.target.value as ThemePreference)}>
              {THEME_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <div className="field-row">
            <label className="field" style={{ flex: 1 }}>
              <span>Grade do canvas</span>
              <select value={gridVariant} onChange={(e) => setGridVariant(e.target.value as GridVariant)}>
                {GRID_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="field" style={{ flex: 1 }}>
              <span>Espaçamento</span>
              <input
                type="number"
                min={10}
                max={60}
                disabled={gridVariant === 'none'}
                value={gridGap}
                onChange={(e) => setGridGap(Number(e.target.value) || 22)}
              />
            </label>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
