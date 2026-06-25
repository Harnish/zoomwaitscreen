const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')

let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 480,
    height: 580,
    resizable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    title: 'Zoom Wait Screen',
    backgroundColor: '#1e1e2e'
  })
  mainWindow.loadFile('index.html')
}

ipcMain.handle('choose-background', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp'] }]
  })
  return result.canceled ? null : result.filePaths[0]
})

ipcMain.handle('show-display', (event, width, height) => {
  mainWindow.setResizable(true)
  mainWindow.setSize(width, height)
  mainWindow.setResizable(false)
  mainWindow.center()
  mainWindow.loadFile('display.html')
})

ipcMain.handle('show-settings', () => {
  mainWindow.setResizable(true)
  mainWindow.setSize(480, 580)
  mainWindow.setResizable(false)
  mainWindow.center()
  mainWindow.loadFile('index.html')
})

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
