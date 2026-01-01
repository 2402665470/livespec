/**
 * LiveSpec Preload Script
 *
 * Exposes type-safe APIs to the renderer process via contextBridge.
 */

import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { ElectronAPI, SpecGraphData } from '../shared/types'

// =============================================================================
// MARK: Custom API
// =============================================================================

const api: ElectronAPI = {
  // Project Operations
  openProject: () => ipcRenderer.invoke('app:open-project'),

  // Server Operations
  startServer: (config?: { wsPort?: number; httpPort?: number }) =>
    ipcRenderer.invoke('server:start', config),

  stopServer: () => ipcRenderer.invoke('server:stop'),

  // Event Listeners
  onGraphUpdate: (callback) => {
    const listener = (_event: unknown, data: { graph: SpecGraphData }) => callback(data)
    ipcRenderer.on('graph:update', listener)
    return () => ipcRenderer.removeListener('graph:update', listener)
  },

  onFileChanged: (callback) => {
    const listener = (_event: unknown, data: { filePath: string; content: string }) =>
      callback(data)
    ipcRenderer.on('file:changed', listener)
    return () => ipcRenderer.removeListener('file:changed', listener)
  },

  onServerReady: (callback) => {
    const listener = (_event: unknown, data: { wsPort: number; httpPort: number }) =>
      callback(data)
    ipcRenderer.on('server:ready', listener)
    return () => ipcRenderer.removeListener('server:ready', listener)
  }
}

// Extend the window interface with our custom API
declare global {
  interface Window {
    electron: {
      ipcRenderer: {
        invoke: (channel: string, ...args: unknown[]) => Promise<unknown>
        on: (channel: string, listener: (...args: unknown[]) => void) => void
        removeListener: (channel: string, listener: (...args: unknown[]) => void) => void
      }
    }
  }
}

// =============================================================================
// MARK: Context Bridge Exposure
// =============================================================================

if (process.contextIsolated) {
  try {
    // Expose electron-toolkit's standard API (includes ipcRenderer)
    contextBridge.exposeInMainWorld('electron', electronAPI)

    // Extend electron with our custom API
    contextBridge.exposeInMainWorld('livespec', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.livespec = api
}
