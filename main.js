const { app, BrowserWindow, ipcMain, dialog } = require('electron')

let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 480,
    height: 580,
    frame: false,
    resizable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    title: 'Zoom Wait Screen',
    backgroundColor: '#1e1e2e'
  })
  mainWindow.loadFile('index.html').catch(err => console.error('Failed to load index.html:', err))
}

ipcMain.handle('choose-background', async () => {
  if (!mainWindow) return null
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp'] }]
  })
  return result.canceled ? null : result.filePaths[0]
})

ipcMain.handle('show-display', (event, width, height) => {
  if (!mainWindow) return
  const w = Number.isFinite(width) && width > 0 ? Math.round(width) : 1280
  const h = Number.isFinite(height) && height > 0 ? Math.round(height) : 720
  mainWindow.setResizable(true)
  mainWindow.setSize(w, h)
  mainWindow.setResizable(false)
  mainWindow.center()
  mainWindow.loadFile('display.html').catch(err => console.error('Failed to load display.html:', err))
})

ipcMain.handle('show-settings', () => {
  if (!mainWindow) return
  mainWindow.setResizable(true)
  mainWindow.setSize(480, 580)
  mainWindow.setResizable(false)
  mainWindow.center()
  mainWindow.loadFile('index.html').catch(err => console.error('Failed to load index.html:', err))
})

ipcMain.handle('quit-app', () => {
  app.quit()
})

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
