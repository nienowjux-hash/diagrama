import { createPortal } from 'react-dom'
import { AlertTriangle, X } from 'lucide-react'
import { deviceTypeConfig } from '../lib/deviceTypeConfig'
import type { DuplicateWarning } from '../lib/duplicateDetection'

export default function DuplicateWarningModal({
  warnings,
  onKeep,
  onUndo
}: {
  warnings: DuplicateWarning[]
  onKeep: () => void
  onUndo: () => void
}) {
  return createPortal(
    <div className="modal-overlay" onClick={onUndo}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <span>
            <AlertTriangle size={14} style={{ verticalAlign: 'text-bottom', marginRight: 6, color: '#f59e0b' }} />
            Possíveis dispositivos duplicados
          </span>
          <button type="button" className="icon-button" onClick={onUndo}>
            <X size={16} />
          </button>
        </div>

        <div className="modal__body">
          <div className="modal__status">
            A IA gerou {warnings.length} dispositivo(s) com nome parecido a algo que já existia no
            canvas, em vez de reaproveitar o dispositivo existente. Confira antes de continuar:
          </div>

          <div className="duplicate-warning__list">
            {warnings.map((w, i) => (
              <div key={i} className="duplicate-warning__item">
                <span className="chip">{deviceTypeConfig[w.type].label}</span>
                <span className="duplicate-warning__existing">{w.existingLabel}</span>
                <span className="duplicate-warning__arrow">→ novo:</span>
                <span className="duplicate-warning__generated">{w.generatedLabel}</span>
              </div>
            ))}
          </div>

          <div className="modal__actions" style={{ marginTop: 12, gap: 8, display: 'flex' }}>
            <button type="button" className="button--secondary" onClick={onUndo}>
              Desfazer geração
            </button>
            <button type="button" onClick={onKeep}>
              Aplicar mesmo assim
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
