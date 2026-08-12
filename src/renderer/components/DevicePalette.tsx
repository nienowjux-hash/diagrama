import { useMemo, useRef, useState, type ChangeEvent } from 'react'
import { Image as ImageIcon, SquaresFour } from '@phosphor-icons/react'
import { useDiagramStore } from '../state/diagramStore'
import { DEVICE_PRESETS, presetColor, presetIcon } from '../lib/devicePresets'
import { deviceTypeConfig } from '../lib/deviceTypeConfig'

export default function DevicePalette() {
  const addDevice = useDiagramStore((s) => s.addDevice)
  const addImageNode = useDiagramStore((s) => s.addImageNode)
  const addGroupNode = useDiagramStore((s) => s.addGroupNode)
  const nodeCount = useDiagramStore((s) => s.nodes.length)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [filter, setFilter] = useState('')

  function nextPosition() {
    return { x: 80 + ((nodeCount * 40) % 400), y: 80 + ((nodeCount * 60) % 300) }
  }

  function handleImageSelected(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') addImageNode(reader.result, nextPosition())
    }
    reader.readAsDataURL(file)
  }

  const filteredPresets = useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return DEVICE_PRESETS
    return DEVICE_PRESETS.filter(
      (p) => p.label.toLowerCase().includes(q) || p.vendorModel?.toLowerCase().includes(q)
    )
  }, [filter])

  const imageColor = deviceTypeConfig.image.color
  const groupColor = deviceTypeConfig.group.color

  return (
    <div className="device-palette">
      <div className="device-palette__title">Adicionar dispositivo</div>
      <input
        className="device-palette__filter"
        placeholder="Buscar (ex: câmera, router...)"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />
      <div className="device-palette__grid">
        {filteredPresets.map((preset) => {
          const Icon = presetIcon(preset)
          const color = presetColor(preset)
          return (
            <button
              key={preset.key}
              type="button"
              className="device-palette__item"
              title={`Adicionar ${preset.label}`}
              onClick={() =>
                addDevice(preset.type, nextPosition(), {
                  label: preset.label,
                  vendorModel: preset.vendorModel,
                  icon: preset.iconKey
                })
              }
            >
              <Icon size={16} color={color} weight="duotone" />
              <span>{preset.label}</span>
            </button>
          )
        })}
        <button
          type="button"
          className="device-palette__item"
          title="Inserir imagem"
          onClick={() => fileInputRef.current?.click()}
        >
          <ImageIcon size={16} color={imageColor} weight="duotone" />
          <span>Imagem</span>
        </button>
        <button
          type="button"
          className="device-palette__item"
          title="Adicionar caixa de agrupamento (quadro visual)"
          onClick={() => addGroupNode(nextPosition())}
        >
          <SquaresFour size={16} color={groupColor} weight="duotone" />
          <span>Grupo</span>
        </button>
      </div>
      {filteredPresets.length === 0 && <div className="device-palette__empty">Nenhum resultado.</div>}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleImageSelected}
      />
    </div>
  )
}
