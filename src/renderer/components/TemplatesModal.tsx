import { createPortal } from 'react-dom'
import { X, LayoutTemplate } from 'lucide-react'
import { useDiagramStore } from '../state/diagramStore'
import { useTabsStore } from '../state/tabsStore'
import { DIAGRAM_TEMPLATES } from '../lib/diagramTemplates'

export default function TemplatesModal({ onClose }: { onClose: () => void }) {
  const hasNodes = useDiagramStore((s) => s.nodes.length > 0)
  const loadDiagram = useDiagramStore((s) => s.loadDiagram)
  const autoArrange = useDiagramStore((s) => s.autoArrange)
  const newTab = useTabsStore((s) => s.newTab)
  const renameActiveTab = useTabsStore((s) => s.renameActiveTab)

  function applyTemplate(templateKey: string) {
    const template = DIAGRAM_TEMPLATES.find((t) => t.key === templateKey)
    if (!template) return
    if (hasNodes) newTab()
    loadDiagram(template.build())
    autoArrange()
    renameActiveTab(template.name)
    onClose()
  }

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <span>Modelos prontos</span>
          <button type="button" className="icon-button" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="modal__body">
          <div className="modal__status" style={{ marginTop: 0, marginBottom: 12 }}>
            {hasNodes
              ? 'Abre em uma nova aba, com o diagrama atual preservado.'
              : 'Carrega o modelo e organiza automaticamente — depois é só editar.'}
          </div>
          <div className="templates-list">
            {DIAGRAM_TEMPLATES.map((template) => (
              <button
                key={template.key}
                type="button"
                className="templates-list__item"
                onClick={() => applyTemplate(template.key)}
              >
                <LayoutTemplate size={18} />
                <div className="templates-list__text">
                  <div className="templates-list__name">{template.name}</div>
                  <div className="templates-list__description">{template.description}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
