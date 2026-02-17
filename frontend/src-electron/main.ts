import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'

let mainWindow: BrowserWindow | null = null
let modulesWindow: BrowserWindow | null = null
let maintenanceWindow: BrowserWindow | null = null

const devServerUrl = process.env.VITE_DEV ? 'http://localhost:5173' : null

function getAppPath() {
  // In dev: frontend root, in prod: packaged app root
  return process.env.VITE_DEV ? process.cwd() : app.getAppPath()
}

function loadRouteInWindow(targetWindow: BrowserWindow, hash: string) {
  if (devServerUrl) {
    targetWindow.loadURL(`${devServerUrl}/#${hash}`)
    targetWindow.webContents.once('did-fail-load', () => {
      const appPath = getAppPath()
      targetWindow.loadFile(path.join(appPath, 'dist', 'index.html'), { hash })
    })
    return
  }

  const appPath = getAppPath()
  targetWindow.loadFile(path.join(appPath, 'dist', 'index.html'), { hash })
}

function createWindow() {
  const appPath = getAppPath()
  const preloadPath = path.join(appPath, 'dist-electron', 'preload.js')
  
  console.log('Creating login window...')
  console.log('App path:', appPath)
  console.log('Preload path:', preloadPath)
  
  mainWindow = new BrowserWindow({
    width: 400,
    height: 350,
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
    },
    frame: false,
    icon: path.join(appPath, 'public', 'logo.png'),
    show: false,
  })

  mainWindow.once('ready-to-show', () => {
    console.log('Login window ready, showing now!')
    mainWindow?.show()
  })

  // Set Content-Security-Policy header
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self' http://localhost:3000"
        ],
      },
    })
  })

  // Ensure a fresh login state on app start
  mainWindow.webContents.session.clearStorageData({ storages: ['localstorage'] })
    .finally(() => {
      loadRouteInWindow(mainWindow!, '/login')
    })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function createModulesWindow() {
  const appPath = getAppPath()
  const preloadPath = path.join(appPath, 'dist-electron', 'preload.js')

  console.log('Creating modules window...')

  modulesWindow = new BrowserWindow({
    width: 600,
    height: 400,
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
    },
    frame: false,
    icon: path.join(appPath, 'public', 'logo.png'),
    show: false,
  })

  modulesWindow.once('ready-to-show', () => {
    console.log('Modules window ready, showing now!')
    modulesWindow?.show()
  })

  // Set Content-Security-Policy header
  modulesWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self' http://localhost:3000"
        ],
      },
    })
  })

  loadRouteInWindow(modulesWindow, '/modules')

  modulesWindow.on('closed', () => {
    modulesWindow = null
  })
}

function createMaintenanceWindow() {
  const appPath = getAppPath()
  const preloadPath = path.join(appPath, 'dist-electron', 'preload.js')

  console.log('Creating maintenance window...')

  maintenanceWindow = new BrowserWindow({
    width: 1000,
    height: 850,
    maxWidth: 1000,
    maxHeight: 1000,
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
    },
    frame: false,
    icon: path.join(appPath, 'public', 'logo.png'),
    show: false,
  })

  maintenanceWindow.once('ready-to-show', () => {
    console.log('Maintenance window ready, showing now!')
    maintenanceWindow?.show()
  })

  // Set Content-Security-Policy header
  maintenanceWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self' http://localhost:3000"
        ],
      },
    })
  })

  loadRouteInWindow(maintenanceWindow, '/maintenance')

  maintenanceWindow.on('closed', () => {
    maintenanceWindow = null
  })
}

app.on('ready', createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})

// IPC Handlers
ipcMain.on('close-window', () => {
  if (mainWindow) {
    mainWindow.close()
  }
})

ipcMain.on('open-modules-window', () => {
  console.log('Opening modules window...')

  if (mainWindow) {
    mainWindow.close()
    mainWindow = null
  }

  if (!modulesWindow) {
    createModulesWindow()
  } else {
    modulesWindow.focus()
  }
})

ipcMain.on('return-to-login', () => {
  console.log('Returning to login...')

  if (modulesWindow) {
    modulesWindow.close()
    modulesWindow = null
  }

  if (maintenanceWindow) {
    maintenanceWindow.close()
    maintenanceWindow = null
  }

  if (!mainWindow) {
    createWindow()
  } else {
    mainWindow.focus()
  }
})

ipcMain.on('open-maintenance-window', () => {
  console.log('Opening maintenance window...')

  if (modulesWindow) {
    modulesWindow.close()
    modulesWindow = null
  }

  if (!maintenanceWindow) {
    createMaintenanceWindow()
  } else {
    maintenanceWindow.focus()
  }
})

ipcMain.on('return-to-modules', () => {
  console.log('Returning to modules...')

  if (maintenanceWindow) {
    maintenanceWindow.close()
    maintenanceWindow = null
  }

  if (!modulesWindow) {
    createModulesWindow()
  } else {
    modulesWindow.focus()
  }
})
