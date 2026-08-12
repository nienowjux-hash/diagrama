import { useState, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { X, Download } from 'lucide-react'
import { useDiagramStore } from '../state/diagramStore'
import {
  exportDiagram,
  EXPORT_FORMATS,
  type ExportFormat,
  type ExportBackground,
  type ExportScale
} from '../lib/exportImage'

const BACKGROUND_OPTIONS: { value: ExportBackground; label: string }[] = [
  { value: 'white', label: 'Branco' },
  { value: 'transparent', label: 'Transparente' },
  { value: 'theme', label: 'Tema atual (igual à tela)' }
]

const SCALE_OPTIONS: { value: ExportScale; label: string }[] = [
  { value: 1, label: '1x (padrão)' },
  { value: 2, label: '2x (alta resolução)' },
  { value: 3, label: '3x (impressão)' }
]

export default function ExportModal({
  onClose,
  canvasRef
}: {
  onClose: () => void
  canvasRef: RefObject<HTMLDivElement | null>
}) {
  const nodes = useDiagramStore((s) => s.nodes)
  const [format, setFormat] = useState<ExportFormat>('png')
  const [background, setBackground] = useState<ExportBackground>('white')
  const [scale, setScale] = useState<ExportScale>(2)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const formatInfo = EXPORT_FORMATS.find((f) => f.value === format)!
  const isVector = format === 'svg'

  async function handleExport() {
    const container = canvasRef.current
    if (!container) return
    setExporting(true)
    setError(null)
    try {
      const dataUrl = await exportDiagram(format, { container, nodes, background, scale })
      const result = await window.diagramAPI.exportFile(
        dataUrl,
        `diagrama.${formatInfo.extensions[0]}`,
        formatInfo.label,
        formatInfo.extensions
      )
      if (result.ok) onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao exportar a imagem.')
    } finally {
      setExporting(false)
    }
  }

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <span>Exportar diagrama</span>
          <button type="button" className="icon-button" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="modal__body">
          <label className="field">
            <span>Formato</span>
            <select value={format} onChange={(e) => setFormat(e.target.value as ExportFormat)}>
              {EXPORT_FORMATS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Fundo</span>
            <select value={background} onChange={(e) => setBackground(e.target.value as ExportBackground)}>
              {BACKGROUND_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Resolução {isVector && '(não se aplica a SVG)'}</span>
            <select
              value={scale}
              disabled={isVector}
              onChange={(e) => setScale(Number(e.target.value) as ExportScale)}
            >
              {SCALE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <div className="modal__status">
            O tamanho é calculado a partir de todos os {nodes.length} dispositivo(s) do diagrama,
            não apenas do que está visível na tela agora.
          </div>

          {error && <div className="prompt-panel__error">{error}</div>}

          <div className="modal__actions" style={{ marginTop: 12 }}>
            <button type="button" onClick={handleExport} disabled={exporting || nodes.length === 0}>
              <Download size={13} style={{ verticalAlign: 'text-bottom', marginRight: 4 }} />
              {exporting ? 'Exportando...' : 'Exportar'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
