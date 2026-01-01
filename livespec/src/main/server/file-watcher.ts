/**
 * File Watcher
 *
 * Uses Chokidar to watch spec files and HTML files for live hot-reload
 */

import chokidar, { type FSWatcher } from 'chokidar'
import { BrowserWindow } from 'electron'
import { extname, basename } from 'path'
import { readFileSync } from 'fs'
import { broadcast } from './websocket-server'
import { type WSMessage, type SpecGraphData, WSMessageType } from '../../shared/types'

let watcher: FSWatcher | null = null
let mainWindow: BrowserWindow | null = null

// Set the main window reference (called from main process)
export function setMainWindow(window: BrowserWindow | null): void {
  mainWindow = window
}

/**
 * Start file watcher
 */
export function startFileWatcher(rootPath: string): void {
  if (watcher) {
    stopFileWatcher()
  }

  console.log('[FileWatcher] Starting watcher for:', rootPath)

  // Check if .LiveSpec subdirectory exists
  const { join } = require('path')
  const { existsSync } = require('fs')
  const livespecDir = join(rootPath, '.LiveSpec')
  const hasLiveSpecDir = existsSync(livespecDir)

  if (hasLiveSpecDir) {
    console.log('[FileWatcher] Found .LiveSpec subdirectory, will watch it too')
  }

  // Paths to watch: root and optionally .LiveSpec subdirectory
  const pathsToWatch = hasLiveSpecDir ? [rootPath, livespecDir] : [rootPath]

  watcher = chokidar.watch(pathsToWatch, {
    // Ignore common files/directories (but not .LiveSpec)
    ignored: [
      /(^|[\/\\])\.\w+/, // dotfiles (but will still watch .LiveSpec since it's explicitly added)
      /node_modules/,
      /\.git/,
      /\.vscode/,
      /dist/,
      /build/,
      /out/
    ],
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 100,
      pollInterval: 50
    }
  })

  // File changed
  watcher.on('change', (filePath) => {
    handleFileChange('change', filePath)
  })

  // File added
  watcher.on('add', (filePath) => {
    console.log(`[FileWatcher] File added: ${filePath}`)
    handleFileChange('add', filePath)
  })

  // File removed
  watcher.on('unlink', (filePath) => {
    console.log(`[FileWatcher] File removed: ${filePath}`)
    handleFileChange('unlink', filePath)
  })

  // Watcher ready
  watcher.on('ready', () => {
    console.log('[FileWatcher] Ready and watching for changes')
  })

  // Error handling
  watcher.on('error', (error) => {
    console.error('[FileWatcher] Error:', error)
  })
}

/**
 * Stop file watcher
 */
export function stopFileWatcher(): void {
  if (watcher) {
    watcher.close()
    watcher = null
    console.log('[FileWatcher] Stopped')
  }
}

/**
 * Handle file changes
 */
function handleFileChange(type: 'add' | 'change' | 'unlink', filePath: string) {
  const ext = extname(filePath).toLowerCase()
  const filename = basename(filePath)

  console.log(`[FileWatcher] ${type.toUpperCase()}: ${filePath}`)

  // Handle HTML files (trigger hot-reload)
  if (ext === '.html') {
    handleHTMLFileChange(filePath)
    return
  }

  // Handle spec_graph.json (trigger graph update)
  if (filename === 'spec_graph.json') {
    handleGraphFileChange(filePath)
    return
  }
}

/**
 * Handle HTML file changes - broadcast to WebSocket clients
 */
function handleHTMLFileChange(filePath: string) {
  console.log('[FileWatcher] HTML file changed, broadcasting reload signal')

  try {
    // Broadcast FILE_CHANGED message to all WebSocket clients
    const message: WSMessage<WSMessageType.FILE_CHANGED> = {
      type: WSMessageType.FILE_CHANGED,
      timestamp: new Date().toISOString(),
      payload: {
        filePath,
        content: '' // Content not needed for reload
      }
    }

    broadcast(message)
    console.log('[FileWatcher] Broadcasted FILE_CHANGED to WebSocket clients')
  } catch (error) {
    console.error('[FileWatcher] Failed to broadcast file change:', error)
  }
}

/**
 * Handle spec_graph.json changes - update Renderer via IPC
 */
function handleGraphFileChange(filePath: string) {
  console.log('[FileWatcher] spec_graph.json changed, updating graph')

  try {
    // Read and parse the graph file
    const content = readFileSync(filePath, 'utf-8')
    const graph: SpecGraphData = JSON.parse(content)

    // Validate basic structure
    if (!graph.meta || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) {
      throw new Error('Invalid graph structure')
    }

    console.log('[FileWatcher] Graph loaded:', graph.meta.name, graph.nodes.length, 'nodes')

    // Send to Renderer via IPC
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('graph:update', { graph })
      console.log('[FileWatcher] Sent GRAPH_UPDATE to Renderer')
    } else {
      console.warn('[FileWatcher] Main window not available')
    }

    // Also broadcast to WebSocket clients
    const message: WSMessage<WSMessageType.GRAPH_SYNC> = {
      type: WSMessageType.GRAPH_SYNC,
      timestamp: new Date().toISOString(),
      payload: {
        graph,
        fullSync: true
      }
    }

    broadcast(message)
  } catch (error) {
    console.error('[FileWatcher] Failed to load graph:', error)
  }
}

// =============================================================================
// MARK: Legacy API (for backward compatibility)
// =============================================================================

const watchedFiles = new Map<string, Set<string>>() // filePath -> graphIds

export function watchFile(filePath: string, graphId: string): void {
  if (!watchedFiles.has(filePath)) {
    watchedFiles.set(filePath, new Set())
  }
  watchedFiles.get(filePath)!.add(graphId)
}

export function unwatchFile(filePath: string, graphId?: string): void {
  if (graphId) {
    const graphIds = watchedFiles.get(filePath)
    if (graphIds) {
      graphIds.delete(graphId)
      if (graphIds.size === 0) {
        watchedFiles.delete(filePath)
      }
    }
  } else {
    watchedFiles.delete(filePath)
  }
}

export function isWatching(filePath: string): boolean {
  return watchedFiles.has(filePath)
}
