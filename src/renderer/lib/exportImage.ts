import { getNodesBounds, getViewportForBounds, type Node } from '@xyflow/react'
import { toPng, toSvg } from 'html-to-image'
import { jsPDF } from 'jspdf'
import type { DeviceNodeData } from '@shared/types'

export type ExportFormat = 'png' | 'svg' | 'pdf'
export type ExportBackground = 'transparent' | 'white' | 'theme'
export type ExportScale = 1 | 2 | 3

const MIN_IMAGE_SIDE = 640
const PADDING_FRACTION = 0.08

export interface ExportOptions {
  container: HTMLElement
  nodes: Node<DeviceNodeData>[]
  background: ExportBackground
  scale: ExportScale
}

export const EXPORT_FORMATS: { value: ExportFormat; label: string; extensions: string[] }[] = [
  { value: 'png', label: 'PNG (imagem)', extensions: ['png'] },
  { value: 'svg', label: 'SVG (vetor)', extensions: ['svg'] },
  { value: 'pdf', label: 'PDF (documento)', extensions: ['pdf'] }
]

function resolveBackgroundColor(background: ExportBackground): string | undefined {
  if (background === 'transparent') return undefined
  if (background === 'white') return '#ffffff'
  return getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#0f172a'
}

function prepareViewport(container: HTMLElement, nodes: Node<DeviceNodeData>[], scale: ExportScale) {
  const viewportEl = container.querySelector('.react-flow__viewport') as HTMLElement | null
  if (!viewportEl || nodes.length === 0) {
    throw new Error('Nada para exportar: o diagrama esta vazio.')
  }

  const bounds = getNodesBounds(nodes)
  const width = Math.max(MIN_IMAGE_SIDE, Math.round(bounds.width * scale))
  const height = Math.max(MIN_IMAGE_SIDE, Math.round(bounds.height * scale))
  const viewport = getViewportForBounds(bounds, width, height, 0.1, 2, PADDING_FRACTION)

  return {
    viewportEl,
    width,
    height,
    style: {
      width: `${width}px`,
      height: `${height}px`,
      transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`
    }
  }
}

/** Renders the whole diagram (not just what's currently visible/zoomed) to a PNG data URL. */
export async function exportDiagramToPng({ container, nodes, background, scale }: ExportOptions): Promise<string> {
  const { viewportEl, width, height, style } = prepareViewport(container, nodes, scale)
  return toPng(viewportEl, { width, height, style, backgroundColor: resolveBackgroundColor(background), pixelRatio: 1 })
}

/** Renders the whole diagram to an SVG (vector) data URL. */
export async function exportDiagramToSvg({ container, nodes, background, scale }: ExportOptions): Promise<string> {
  const { viewportEl, width, height, style } = prepareViewport(container, nodes, scale)
  return toSvg(viewportEl, { width, height, style, backgroundColor: resolveBackgroundColor(background) })
}

/** Rasterizes the diagram and places it on a single PDF page sized to match. */
export async function exportDiagramToPdf(options: ExportOptions): Promise<string> {
  const pngDataUrl = await exportDiagramToPng(options)
  const { width, height } = prepareViewport(options.container, options.nodes, options.scale)

  const doc = new jsPDF({
    orientation: width >= height ? 'landscape' : 'portrait',
    unit: 'px',
    format: [width, height]
  })
  doc.addImage(pngDataUrl, 'PNG', 0, 0, width, height)
  return doc.output('datauristring')
}

export async function exportDiagram(format: ExportFormat, options: ExportOptions): Promise<string> {
  if (format === 'svg') return exportDiagramToSvg(options)
  if (format === 'pdf') return exportDiagramToPdf(options)
  return exportDiagramToPng(options)
}
