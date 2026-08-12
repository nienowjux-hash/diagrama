import { dialog, BrowserWindow } from 'electron'
import { writeFileSync } from 'fs'
import type { ExportFileResult } from '@shared/ipc'

/**
 * Handles data URLs with any number of `;key=value` header segments (e.g. jsPDF's
 * `data:application/pdf;filename=generated.pdf;base64,xxx`), not just the simple
 * `data:mime;base64,xxx` / `data:mime,xxx` shapes.
 */
function dataUrlToBuffer(dataUrl: string): Buffer {
  const commaIndex = dataUrl.indexOf(',')
  if (!dataUrl.startsWith('data:') || commaIndex === -1) {
    throw new Error('URL de dados invalida.')
  }
  const header = dataUrl.slice('data:'.length, commaIndex)
  const payload = dataUrl.slice(commaIndex + 1)
  const isBase64 = header.split(';').includes('base64')
  return isBase64 ? Buffer.from(payload, 'base64') : Buffer.from(decodeURIComponent(payload), 'utf-8')
}

export async function exportFileToDisk(
  win: BrowserWindow,
  dataUrl: string,
  suggestedName: string,
  filterLabel: string,
  extensions: string[]
): Promise<ExportFileResult> {
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: 'Exportar diagrama',
    defaultPath: suggestedName,
    filters: [{ name: filterLabel, extensions }]
  })
  if (canceled || !filePath) return { ok: false, canceled: true }

  writeFileSync(filePath, dataUrlToBuffer(dataUrl))
  return { ok: true, filePath }
}
