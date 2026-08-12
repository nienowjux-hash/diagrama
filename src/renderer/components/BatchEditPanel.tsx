import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { useDiagramStore } from '../state/diagramStore'

/**
 * Shown instead of NodePropertiesPanel when more than one device is selected
 * (Shift+click or a Shift-drag box-select on the canvas — React Flow already
 * tracks `node.selected` for us, we just read it). Batch color apply is a
 * single updateManyDevices call since `color` is a top-level field; VLANs go
 * through per-node updateDevice calls instead, because `metadata` would
 * otherwise be replaced wholesale and wipe out each node's own IP/ports/notes.
 */
export default function BatchEditPanel() {
  const nodes = useDiagramStore((s) => s.nodes)
  const updateManyDevices = useDiagramStore((s) => s.updateManyDevices)
  const updateDevice = useDiagramStore((s) => s.updateDevice)
  const removeDevice = useDiagramStore((s) => s.removeDevice)
  const [vlanInput, setVlanInput] = useState('')

  const selected = nodes.filter((n) => n.selected && n.data.type !== 'image' && n.data.type !== 'group')
  if (selected.length < 2) return null
  const ids = selected.map((n) => n.id)

  function applyVlans() {
    const vlanIds = vlanInput
      .split(',')
      .map((v) => parseInt(v.trim(), 10))
      .filter((v) => !Number.isNaN(v))
    for (const node of selected) {
      updateDevice(node.id, { metadata: { ...node.data.metadata, vlanIds } })
    }
    setVlanInput('')
  }

  return (
    <div className="properties-panel">
      <div className="properties-panel__header">
        <span>{selected.length} selecionados</span>
        <button
          type="button"
          className="icon-button icon-button--danger"
          title="Excluir todos os selecionados"
          onClick={() => ids.forEach((id) => removeDevice(id))}
        >
          <Trash2 size={15} />
        </button>
      </div>

      <label className="field">
        <span>Cor (aplica a todos)</span>
        <div className="color-field">
          <input type="color" onChange={(e) => updateManyDevices(ids, { color: e.target.value })} />
          <button type="button" className="link-button" onClick={() => updateManyDevices(ids, { color: undefined })}>
            padrão
          </button>
        </div>
      </label>

      <label className="field">
        <span>VLANs (substitui em todos, separadas por vírgula)</span>
        <div className="color-field">
          <input
            value={vlanInput}
            placeholder="ex: 10, 20"
            onChange={(e) => setVlanInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applyVlans()}
          />
          <button type="button" className="link-button" onClick={applyVlans}>
            Aplicar
          </button>
        </div>
      </label>

      <div className="modal__status">
        Segure Shift e clique (ou arraste) no canvas para ajustar a seleção.
      </div>
    </div>
  )
}
