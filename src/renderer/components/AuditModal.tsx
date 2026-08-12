import { useMemo } from 'react'
import { createPortal } from 'react-dom'
import { X, Stethoscope, AlertTriangle, Info, CheckCircle2 } from 'lucide-react'
import { useDiagramStore } from '../state/diagramStore'
import { auditDiagram } from '../lib/networkAudit'

export default function AuditModal({ onClose }: { onClose: () => void }) {
  const toDiagram = useDiagramStore((s) => s.toDiagram)
  const setSelectedNode = useDiagramStore((s) => s.setSelectedNode)
  const nodesVersion = useDiagramStore((s) => s.nodes)
  const edgesVersion = useDiagramStore((s) => s.edges)
  const vlansVersion = useDiagramStore((s) => s.vlans)

  // Recompute whenever the diagram actually changes underneath the modal —
  // toDiagram() itself isn't reactive (it's a plain getter), so the audit
  // needs to depend on the reactive slices directly.
  const findings = useMemo(
    () => auditDiagram(toDiagram()),
    [nodesVersion, edgesVersion, vlansVersion, toDiagram]
  )

  const warningCount = findings.filter((f) => f.severity === 'warning').length
  const infoCount = findings.filter((f) => f.severity === 'info').length

  function goTo(deviceIds: string[]) {
    if (deviceIds[0]) setSelectedNode(deviceIds[0])
  }

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <span>
            <Stethoscope size={15} style={{ verticalAlign: 'text-bottom', marginRight: 7 }} />
            Auditoria de rede
          </span>
          <button type="button" className="icon-button" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="modal__body">
          {findings.length === 0 ? (
            <div className="audit-empty">
              <CheckCircle2 size={28} color="#16a34a" />
              <div>Nada a apontar — não achei problemas óbvios de design ou documentação.</div>
            </div>
          ) : (
            <>
              <div className="modal__status" style={{ marginTop: 0, marginBottom: 12 }}>
                {warningCount > 0 && `${warningCount} aviso(s)`}
                {warningCount > 0 && infoCount > 0 && ' · '}
                {infoCount > 0 && `${infoCount} observação(ões)`} — checagem estrutural
                determinística, não usa IA.
              </div>
              <div className="audit-list">
                {findings.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    className={`audit-list__item audit-list__item--${f.severity}`}
                    onClick={() => goTo(f.deviceIds)}
                    disabled={f.deviceIds.length === 0}
                  >
                    {f.severity === 'warning' ? (
                      <AlertTriangle size={16} className="audit-list__icon" />
                    ) : (
                      <Info size={16} className="audit-list__icon" />
                    )}
                    <span>{f.message}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
