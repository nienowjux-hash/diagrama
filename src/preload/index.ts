import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '@shared/ipc'
import type { AppSettings, Diagram, ExistingDeviceSummary } from '@shared/types'
import type { DiagramAPI } from '@shared/ipc'

const diagramAPI: DiagramAPI = {
  generateDiagram: (prompt: string, existingDevices: ExistingDeviceSummary[]) =>
    ipcRenderer.invoke(IPC.generateDiagram, prompt, existingDevices),
  onGenerateProgress: (callback: (rawText: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, text: string) => callback(text)
    ipcRenderer.on(IPC.generateProgress, handler)
    return () => ipcRenderer.removeListener(IPC.generateProgress, handler)
  },
  checkOllamaStatus: () => ipcRenderer.invoke(IPC.checkOllamaStatus),
  getAppSettings: () => ipcRenderer.invoke(IPC.getAppSettings),
  setAppSettings: (settings: Partial<AppSettings>) => ipcRenderer.invoke(IPC.setAppSettings, settings),
  saveDiagram: (diagram: Diagram, suggestedName?: string) =>
    ipcRenderer.invoke(IPC.saveDiagram, diagram, suggestedName),
  loadDiagram: () => ipcRenderer.invoke(IPC.loadDiagram),
  exportFile: (dataUrl: string, suggestedName: string, filterLabel: string, extensions: string[]) =>
    ipcRenderer.invoke(IPC.exportFile, dataUrl, suggestedName, filterLabel, extensions),
  setUnsavedChanges: (hasChanges: boolean) => ipcRenderer.send(IPC.setUnsavedChanges, hasChanges)
}

contextBridge.exposeInMainWorld('diagramAPI', diagramAPI)
