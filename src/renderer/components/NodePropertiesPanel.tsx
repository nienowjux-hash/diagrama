import { useEffect, useState } from 'react'
import { Trash2, Copy } from 'lucide-react'
import { useDiagramStore } from '../state/diagramStore'
import { deviceTypeConfig } from '../lib/deviceTypeConfig'
import { DEVICE_PRESETS } from '../lib/devicePresets'
import { iconKeyFor } from '../lib/deviceIcons'
import type { DeviceNodeData } from '@shared/types'

const DEFAULT_FONT_SIZE = 13

/** Matches a node's current (type, icon) to the palette preset that visually
 * represents it, so the dropdown always shows a selection consistent with
 * what's actually rendered on the card. */
function currentPresetKey(data: DeviceNodeData): string {
  const iconKey = data.icon ?? iconKeyFor(deviceTypeConfig[data.type].icon)
  const exact = DEVICE_PRESETS.find((p) => p.type === data.type && p.iconKey === iconKey)
  if (exact) return exact.key
  return DEVICE_PRESETS.find((p) => p.type === data.type)?.key ?? DEVICE_PRESETS[DEVICE_PRESETS.length - 1].key
}

export default function NodePropertiesPanel() {
  const selectedNodeId = useDiagramStore((s) => s.selectedNodeId)
  const node = useDiagramStore((s) => s.nodes.find((n) => n.id === s.selectedNodeId))
  const nodes = useDiagramStore((s) => s.nodes)
  const updateDevice = useDiagramStore((s) => s.updateDevice)
  const removeDevice = useDiagramStore((s) => s.removeDevice)
  const duplicateDevice = useDiagramStore((s) => s.duplicateDevice)

  // The VLANs field is comma-separated free text, but its committed value is
  // a parsed number[] — deriving the input's `value` straight from that
  // array (re-joined) collapses "10," back to "10" on every keystroke,
  // making it impossible to ever type past a comma. Track the raw text
  // locally instead, and only resync it from the model when the *selection*
  // changes (not on every store update caused by this same field typing).
  const [vlanText, setVlanText] = useState('')
  useEffect(() => {
    setVlanText(node?.data.metadata.vlanIds?.join(', ') ?? '')
  }, [selectedNodeId])

  const multiSelectCount = nodes.filter((n) => n.selected).length
  if (!selectedNodeId || !node || multiSelectCount > 1) return null
  const data = node.data
  const isImage = data.type === 'image'
  const isGroup = data.type === 'group'

  const ip = data.metadata.ip?.trim()
  const ipConflict = ip
    ? nodes.find(
        (n) =>
          n.id !== selectedNodeId &&
          n.data.type !== 'image' &&
          n.data.type !== 'group' &&
          n.data.metadata.ip?.trim() === ip
      )
    : undefined

  return (
    <div className="properties-panel">
      <div className="properties-panel__header">
        <span>{isImage ? 'Imagem' : isGroup ? 'Grupo' : 'Dispositivo'}</span>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            type="button"
            className="icon-button"
            title="Duplicar (Ctrl+D)"
            onClick={() => duplicateDevice(selectedNodeId)}
          >
            <Copy size={14} />
          </button>
          <button
            type="button"
            className="icon-button icon-button--danger"
            title="Excluir"
            onClick={() => removeDevice(selectedNodeId)}
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      <label className="field">
        <span>{isImage ? 'Legenda (opcional)' : 'Nome'}</span>
        <input value={data.label} onChange={(e) => updateDevice(selectedNodeId, { label: e.target.value })} />
      </label>

      {isGroup ? (
        <>
          <label className="field">
            <span>Cor</span>
            <div className="color-field">
              <input
                type="color"
                value={data.color ?? deviceTypeConfig.group.color}
                onChange={(e) => updateDevice(selectedNodeId, { color: e.target.value })}
              />
              {data.color && (
                <button
                  type="button"
                  className="link-button"
                  onClick={() => updateDevice(selectedNodeId, { color: undefined })}
                >
                  padrão
                </button>
              )}
            </div>
          </label>
          <div className="modal__status">
            Uma caixa de agrupamento é só um quadro visual — arraste os cantos para
            redimensionar. Os dispositivos dentro dela não se movem junto quando ela é
            arrastada.
          </div>
        </>
      ) : isImage ? (
        <div className="modal__status">
          Arraste os cantos da imagem no canvas para redimensionar.
        </div>
      ) : (
        <>
          <label className="field">
            <span>Tipo</span>
            <select
              value={currentPresetKey(data)}
              onChange={(e) => {
                const preset = DEVICE_PRESETS.find((p) => p.key === e.target.value)
                if (!preset) return
                updateDevice(selectedNodeId, { type: preset.type, icon: preset.iconKey })
              }}
            >
              {DEVICE_PRESETS.map((preset) => (
                <option key={preset.key} value={preset.key}>
                  {preset.label}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Fabricante / Modelo</span>
            <input
              value={data.vendorModel ?? ''}
              placeholder="ex: pfSense, UniFi AP-AC-Pro"
              onChange={(e) => updateDevice(selectedNodeId, { vendorModel: e.target.value })}
            />
          </label>

          <label className="field">
            <span>IP</span>
            <input
              value={data.metadata.ip ?? ''}
              placeholder="ex: 192.168.1.1"
              onChange={(e) =>
                updateDevice(selectedNodeId, { metadata: { ...data.metadata, ip: e.target.value } })
              }
            />
            {ipConflict && (
              <span className="field-warning">IP já usado em "{ipConflict.data.label}"</span>
            )}
          </label>

          <label className="field">
            <span>VLANs (separadas por vírgula)</span>
            <input
              value={vlanText}
              placeholder="ex: 10, 20"
              onChange={(e) => {
                setVlanText(e.target.value)
                const vlanIds = e.target.value
                  .split(',')
                  .map((v) => parseInt(v.trim(), 10))
                  .filter((v) => !Number.isNaN(v))
                updateDevice(selectedNodeId, { metadata: { ...data.metadata, vlanIds } })
              }}
            />
          </label>

          <label className="field">
            <span>Portas</span>
            <input
              type="number"
              value={data.metadata.ports ?? ''}
              onChange={(e) =>
                updateDevice(selectedNodeId, {
                  metadata: {
                    ...data.metadata,
                    ports: e.target.value ? parseInt(e.target.value, 10) : undefined
                  }
                })
              }
            />
          </label>

          <label className="field">
            <span>Notas</span>
            <textarea
              value={data.metadata.notes ?? ''}
              rows={3}
              onChange={(e) =>
                updateDevice(selectedNodeId, { metadata: { ...data.metadata, notes: e.target.value } })
              }
            />
          </label>

          <div className="field-row">
            <label className="field" style={{ flex: 1 }}>
              <span>Cor</span>
              <div className="color-field">
                <input
                  type="color"
                  value={data.color ?? deviceTypeConfig[data.type].color}
                  onChange={(e) => updateDevice(selectedNodeId, { color: e.target.value })}
                />
                {data.color && (
                  <button
                    type="button"
                    className="link-button"
                    onClick={() => updateDevice(selectedNodeId, { color: undefined })}
                  >
                    padrão
                  </button>
                )}
              </div>
            </label>

            <label className="field" style={{ flex: 1 }}>
              <span>Fonte (px)</span>
              <input
                type="number"
                min={9}
                max={28}
                value={data.fontSize ?? DEFAULT_FONT_SIZE}
                onChange={(e) => updateDevice(selectedNodeId, { fontSize: parseInt(e.target.value, 10) })}
              />
            </label>
          </div>

          <div className="modal__status">Selecione o card no canvas para arrastar e redimensionar.</div>
        </>
      )}
    </div>
  )
}
