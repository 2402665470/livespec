/**
 * LiveSpec Main Process
 *
 * Entry point for the Electron main process.
 * Handles application lifecycle, window management, and IPC.
 */

import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

// Internal server modules
import { startFileWatcher, stopFileWatcher, setMainWindow } from './server/file-watcher'
import {
  startExpressServer,
  stopExpressServer
} from './server/express-server'
import {
  startWebSocketServer,
  stopWebSocketServer,
  setGraphId
} from './server/websocket-server'

// Type imports
import type {
  ProjectState,
  SpecGraphData
} from '../shared/types'

// =============================================================================
// MARK: Global State
// =============================================================================

let mainWindow: BrowserWindow | null = null
let currentProject: ProjectState = {
  rootPath: null,
  graph: null,
  serverRunning: false,
  wsPort: 3899,
  httpPort: 3900
}

const DEFAULT_WS_PORT = 3899
const DEFAULT_HTTP_PORT = 3900

// =============================================================================
// MARK: Window Management
// =============================================================================

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
    setMainWindow(null) // Clear window reference in file watcher
  })

  // Set window reference for file watcher (for IPC communication)
  setMainWindow(mainWindow)
}

// =============================================================================
// MARK: IPC Handlers
// =============================================================================

function setupIPCHandlers(): void {
  // Project Management
  ipcMain.handle('app:open-project', async () => {
    try {
      const result = await dialog.showOpenDialog(mainWindow!, {
        properties: ['openDirectory'],
        title: 'Select LiveSpec Project Folder'
      })

      if (result.canceled || result.filePaths.length === 0) {
        return { rootPath: null, canceled: true }
      }

      let rootPath = result.filePaths[0]

      // If user selected the .LiveSpec subdirectory, use its parent as the project root
      const { sep } = await import('path')
      if (rootPath.endsWith(`${sep}.LiveSpec`) || rootPath.endsWith(`${sep}LiveSpec`)) {
        rootPath = rootPath.substring(0, rootPath.lastIndexOf(sep))
        console.log('[Main] Detected LiveSpec subdirectory, using parent:', rootPath)
      }

      console.log('Opening project:', rootPath)

      // Stop existing services
      if (currentProject.serverRunning) {
        stopWebSocketServer()
        stopExpressServer()
        stopFileWatcher()
      }

      // Update project state
      currentProject.rootPath = rootPath
      currentProject.serverRunning = false

      // Start file watcher
      startFileWatcher(rootPath)

      // Try to load spec_graph.json if it exists
      // Check both root directory and .LiveSpec subdirectory
      const fs = await import('fs/promises')
      const { existsSync } = await import('fs')

      const livespecDir = join(rootPath, '.LiveSpec')
      const graphPathInRoot = join(rootPath, 'spec_graph.json')
      const graphPathInLiveSpec = join(livespecDir, 'spec_graph.json')

      let graphPath = graphPathInRoot
      if (!existsSync(graphPathInRoot) && existsSync(graphPathInLiveSpec)) {
        graphPath = graphPathInLiveSpec
        console.log('[Main] Found spec_graph.json in .LiveSpec subdirectory')
      }

      try {
        const graphContent = await fs.readFile(graphPath, 'utf-8')
        const graph: SpecGraphData = JSON.parse(graphContent)
        currentProject.graph = graph
        setGraphId(graph.meta.name)

        console.log('[Main] Graph loaded successfully:', graph.nodes.length, 'nodes,', graph.edges.length, 'edges')
        console.log('[Main] Sending graph:update to renderer')
        // Notify renderer about graph load
        mainWindow?.webContents.send('graph:update', { graph })
        console.log('[Main] graph:update event sent')
      } catch (err) {
        // Graph file doesn't exist yet - this is OK for new projects
        console.log('No spec_graph.json found in project folder')
        currentProject.graph = {
          meta: { name: 'Untitled', version: '1.0.0' },
          nodes: [],
          edges: []
        }
      }

      return { rootPath, canceled: false }
    } catch (error) {
      console.error('Failed to open project:', error)
      return { rootPath: null, canceled: true }
    }
  })

  // Server Control
  ipcMain.handle('server:start', async (_event, payload?: { wsPort?: number; httpPort?: number }) => {
    const wsPort = payload?.wsPort || DEFAULT_WS_PORT
    const httpPort = payload?.httpPort || DEFAULT_HTTP_PORT

    try {
      if (!currentProject.rootPath) {
        throw new Error('No project open')
      }

      // Start Express server (serve the project folder)
      await startExpressServer(httpPort, currentProject.rootPath)

      // Start WebSocket server
      startWebSocketServer({ port: wsPort })

      currentProject.serverRunning = true
      currentProject.wsPort = wsPort
      currentProject.httpPort = httpPort

      mainWindow?.webContents.send('server:ready', { wsPort, httpPort })

      return { success: true, wsPort, httpPort }
    } catch (error) {
      console.error('Failed to start servers:', error)
      return { success: false, wsPort: 0, httpPort: 0 }
    }
  })

  ipcMain.handle('server:stop', async () => {
    try {
      stopWebSocketServer()
      stopExpressServer()

      currentProject.serverRunning = false

      mainWindow?.webContents.send('server:status-changed', { running: false })

      return { success: true }
    } catch (error) {
      console.error('Failed to stop servers:', error)
      return { success: false }
    }
  })
}

// =============================================================================
// MARK: Application Lifecycle
// =============================================================================

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.livespec.app')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  setupIPCHandlers()
  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  stopFileWatcher()
  stopWebSocketServer()
  stopExpressServer()
})
