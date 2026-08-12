import { ipcMain, BrowserWindow } from 'electron'
import { IPC } from '@shared/ipc'
import type { Diagram, ExistingDeviceSummary } from '@shared/types'
import { generateDiagram, checkOllamaStatus } from './llm/client'
import { getAppSettings, setAppSettings } from './settings/appSettings'
import { saveDiagramToFile, loadDiagramFromFile } from './fileIO/diagramFile'
import { exportFileToDisk } from './fileIO/exportFile'

function requireWindow(event: Electron.IpcMainInvokeEvent): BrowserWindow {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (!win) throw new Error('Janela nao encontrada para esta requisicao.')
  return win
}

export function registerIpcHandlers(): void {
  ipcMain.handle(IPC.generateDiagram, async (event, prompt: string, existingDevices: ExistingDeviceSummary[]) => {
    return generateDiagram(prompt, existingDevices, (accumulatedText) => {
      event.sender.send(IPC.generateProgress, accumulatedText)
    })
  })

  ipcMain.handle(IPC.checkOllamaStatus, async () => {
    return checkOllamaStatus()
  })

  ipcMain.handle(IPC.getAppSettings, async () => {
    return getAppSettings()
  })

  ipcMain.handle(IPC.setAppSettings, async (_event, partial) => {
    return setAppSettings(partial)
  })

  ipcMain.handle(IPC.saveDiagram, async (event, diagram: Diagram, suggestedName?: string) => {
    return saveDiagramToFile(requireWindow(event), diagram, suggestedName)
  })

  ipcMain.handle(IPC.loadDiagram, async (event) => {
    return loadDiagramFromFile(requireWindow(event))
  })

  ipcMain.handle(
    IPC.exportFile,
    async (event, dataUrl: string, suggestedName: string, filterLabel: string, extensions: string[]) => {
      return exportFileToDisk(requireWindow(event), dataUrl, suggestedName, filterLabel, extensions)
    }
  )
}
