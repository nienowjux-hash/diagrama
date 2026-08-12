import { dialog, BrowserWindow } from 'electron'
import { readFileSync, writeFileSync } from 'fs'
import { diagramSchema } from '@shared/diagramSchema'
import type { Diagram } from '@shared/types'
import type { LoadDiagramResult, SaveDiagramResult } from '@shared/ipc'

export async function saveDiagramToFile(
  win: BrowserWindow,
  diagram: Diagram,
  suggestedName = 'diagrama.json'
): Promise<SaveDiagramResult> {
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: 'Salvar diagrama',
    defaultPath: suggestedName,
    filters: [{ name: 'Diagrama JSON', extensions: ['json'] }]
  })
  if (canceled || !filePath) return { ok: false, canceled: true }

  writeFileSync(filePath, JSON.stringify(diagram, null, 2), 'utf-8')
  return { ok: true, filePath }
}

export async function loadDiagramFromFile(win: BrowserWindow): Promise<LoadDiagramResult> {
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    title: 'Abrir diagrama',
    properties: ['openFile'],
    filters: [{ name: 'Diagrama JSON', extensions: ['json'] }]
  })
  if (canceled || filePaths.length === 0) return { ok: false, canceled: true }

  const filePath = filePaths[0]
  let raw: unknown
  try {
    raw = JSON.parse(readFileSync(filePath, 'utf-8'))
  } catch {
    return { ok: false, message: 'O arquivo selecionado nao e um JSON valido.' }
  }

  const parsed = diagramSchema.safeParse(raw)
  if (!parsed.success) {
    return { ok: false, message: 'O arquivo nao corresponde ao formato de diagrama esperado.' }
  }

  return { ok: true, diagram: parsed.data, filePath }
}
