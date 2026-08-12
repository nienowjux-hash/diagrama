import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { registerIpcHandlers } from './ipcHandlers'
import { IPC } from '@shared/ipc'

// Pushed proactively from the renderer (see preload's setUnsavedChanges) so the
// close handler below can decide synchronously, without an async round-trip
// while the window is already trying to close.
let hasUnsavedChanges = false
ipcMain.on(IPC.setUnsavedChanges, (_event, value: boolean) => {
  hasUnsavedChanges = value
})

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.on('close', (event) => {
    if (!hasUnsavedChanges) return
    event.preventDefault()
    const choice = dialog.showMessageBoxSync(mainWindow, {
      type: 'warning',
      buttons: ['Fechar sem salvar', 'Cancelar'],
      defaultId: 1,
      cancelId: 1,
      title: 'Alterações não salvas',
      message: 'Há diagramas com alterações não salvas em uma ou mais abas.',
      detail: 'Se fechar agora, essas alterações serão perdidas.'
    })
    if (choice === 0) {
      hasUnsavedChanges = false
      mainWindow.destroy()
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  registerIpcHandlers()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
