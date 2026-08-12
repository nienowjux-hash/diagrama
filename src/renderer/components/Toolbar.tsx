import { useState, type RefObject } from 'react'
import {
  FilePlus,
  FolderOpen,
  Save,
  ImageDown,
  FileSpreadsheet,
  Settings,
  LayoutGrid,
  LayoutTemplate,
  Stethoscope,
  Waypoints,
  Undo2,
  Redo2
} from 'lucide-react'
import { useDiagramStore } from '../state/diagramStore'
import { useTabsStore } from '../state/tabsStore'
import ExportModal from './ExportModal'
import TemplatesModal from './TemplatesModal'
import AuditModal from './AuditModal'
import { buildInventoryCsv } from '../lib/inventoryCsv'

export default function Toolbar({
  onOpenSettings,
  canvasRef
}: {
  onOpenSettings: () => void
  canvasRef: RefObject<HTMLDivElement | null>
}) {
  const toDiagram = useDiagramStore((s) => s.toDiagram)
  const loadDiagram = useDiagramStore((s) => s.loadDiagram)
  const newDiagram = useDiagramStore((s) => s.newDiagram)
  const markSaved = useDiagramStore((s) => s.markSaved)
  const autoArrange = useDiagramStore((s) => s.autoArrange)
  const undo = useDiagramStore((s) => s.undo)
  const redo = useDiagramStore((s) => s.redo)
  const canUndo = useDiagramStore((s) => s.canUndo)
  const canRedo = useDiagramStore((s) => s.canRedo)
  const hasNodes = useDiagramStore((s) => s.nodes.length > 0)
  const newTab = useTabsStore((s) => s.newTab)
  const renameActiveTab = useTabsStore((s) => s.renameActiveTab)
  const [exportOpen, setExportOpen] = useState(false)
  const [templatesOpen, setTemplatesOpen] = useState(false)
  const [auditOpen, setAuditOpen] = useState(false)

  function handleNew() {
    if (hasNodes) newTab()
    else newDiagram()
  }

  async function handleSave() {
    const result = await window.diagramAPI.saveDiagram(toDiagram())
    if (result.ok) markSaved()
  }

  async function handleLoad() {
    const result = await window.diagramAPI.loadDiagram()
    if (result.ok && result.diagram) {
      if (hasNodes) newTab()
      loadDiagram(result.diagram)
      if (result.filePath) {
        const fileName = result.filePath.split(/[\\/]/).pop()?.replace(/\.json$/i, '')
        if (fileName) renameActiveTab(fileName)
      }
    } else if (!result.canceled && result.message) {
      window.alert(result.message)
    }
  }

  async function handleExportInventory() {
    const csv = buildInventoryCsv(toDiagram())
    const dataUrl = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`
    await window.diagramAPI.exportFile(dataUrl, 'inventario.csv', 'CSV', ['csv'])
  }

  return (
    <div className="toolbar">
      <div className="toolbar__brand">
        <div className="toolbar__logo">
          <Waypoints size={16} strokeWidth={2.5} />
        </div>
        <span className="toolbar__title">Diagrama</span>
      </div>
      <div className="toolbar__actions">
        <div className="toolbar__group">
          <button type="button" title="Novo diagrama" onClick={handleNew}>
            <FilePlus size={16} />
          </button>
          <button type="button" title="Abrir" onClick={handleLoad}>
            <FolderOpen size={16} />
          </button>
          <button type="button" title="Modelos prontos" onClick={() => setTemplatesOpen(true)}>
            <LayoutTemplate size={16} />
          </button>
          <button type="button" title="Salvar" onClick={handleSave}>
            <Save size={16} />
          </button>
          <button type="button" title="Exportar imagem/PDF" onClick={() => setExportOpen(true)} disabled={!hasNodes}>
            <ImageDown size={16} />
          </button>
          <button
            type="button"
            title="Exportar inventário (CSV)"
            onClick={handleExportInventory}
            disabled={!hasNodes}
          >
            <FileSpreadsheet size={16} />
          </button>
        </div>
        <div className="toolbar__group">
          <button type="button" title="Desfazer (Ctrl+Z)" onClick={undo} disabled={!canUndo}>
            <Undo2 size={16} />
          </button>
          <button type="button" title="Refazer (Ctrl+Shift+Z)" onClick={redo} disabled={!canRedo}>
            <Redo2 size={16} />
          </button>
        </div>
        <div className="toolbar__group">
          <button type="button" title="Reorganizar automaticamente" onClick={autoArrange} disabled={!hasNodes}>
            <LayoutGrid size={16} />
          </button>
          <button
            type="button"
            title="Analisar diagrama (auditoria de rede)"
            onClick={() => setAuditOpen(true)}
            disabled={!hasNodes}
          >
            <Stethoscope size={16} />
          </button>
        </div>
        <div className="toolbar__group">
          <button type="button" title="Configurações" onClick={onOpenSettings}>
            <Settings size={16} />
          </button>
        </div>
      </div>
      {exportOpen && <ExportModal onClose={() => setExportOpen(false)} canvasRef={canvasRef} />}
      {templatesOpen && <TemplatesModal onClose={() => setTemplatesOpen(false)} />}
      {auditOpen && <AuditModal onClose={() => setAuditOpen(false)} />}
    </div>
  )
}
