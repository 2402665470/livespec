/**
 * Project Store
 *
 * Manages project-level state including:
 * - Current project root path
 * - Graph data
 * - Server status
 * - Loading/error states
 *
 * FIX (Audit Log 02): Removed broken getter pattern.
 * Now uses direct Zustand state properties that properly trigger React re-renders.
 */

import { create } from 'zustand'
import type {
  SpecGraphData,
  IPCChannel
} from '../../../shared/types'

// ============================================================================
// MARK: Store State Interface
// ============================================================================

interface ProjectState {
  // Direct state properties (no underscore prefix - enables proper Zustand reactivity)
  rootPath: string | null
  graph: SpecGraphData | null
  serverRunning: boolean
  wsPort: number
  httpPort: number
  isLoading: boolean
  error: string | null

  // Actions
  openProject: () => Promise<{ rootPath: string | null; canceled: boolean }>
  closeProject: () => void
  setGraph: (graph: SpecGraphData) => void
  startServer: (config?: { wsPort?: number; httpPort?: number }) => Promise<void>
  stopServer: () => Promise<void>
}

// ============================================================================
// MARK: Store Implementation
// ============================================================================

export const useProjectStore = create<ProjectState>((set, get) => ({
  // Initial state (direct properties, no underscore prefix)
  rootPath: null,
  graph: null,
  serverRunning: false,
  wsPort: 3899,
  httpPort: 3900,
  isLoading: false,
  error: null,

  // ------------------------------------------------------------------------
  // MARK: Actions
  // ------------------------------------------------------------------------

  openProject: async () => {
    console.log('[Store] openProject called')
    set({ isLoading: true, error: null })

    try {
      console.log('[Store] Invoking app:open-project')
      const result = await window.electron.ipcRenderer.invoke(
        'app:open-project' as IPCChannel
      )
      console.log('[Store] app:open-project result:', result)

      if (result.canceled) {
        console.log('[Store] Project open canceled by user')
        set({ isLoading: false })
        return result
      }

      console.log('[Store] Setting rootPath to:', result.rootPath)
      set({
        rootPath: result.rootPath,
        isLoading: false
      })

      // The graph will be loaded via the 'graph:update' event
      console.log('[Store] Project opened:', result.rootPath)
      return result
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to open project',
        isLoading: false
      })
      return { rootPath: null, canceled: true }
    }
  },

  closeProject: () => {
    set({
      rootPath: null,
      graph: null,
      serverRunning: false
    })
  },

  setGraph: (graph: SpecGraphData) => {
    console.log('[Store] setGraph called with', graph.nodes.length, 'nodes')

    // Create proper shallow copy to trigger Zustand subscribers
    const newGraph: SpecGraphData = {
      meta: { ...graph.meta },
      nodes: [...graph.nodes],
      edges: [...graph.edges]
    }

    set({ graph: newGraph })

    console.log('[Store] graph state updated, new reference created')
  },

  startServer: async (config = {}) => {
    set({ isLoading: true, error: null })

    try {
      await window.electron.ipcRenderer.invoke('server:start' as IPCChannel, {
        wsPort: config.wsPort || get().wsPort,
        httpPort: config.httpPort || get().httpPort
      })

      set({
        serverRunning: true,
        isLoading: false
      })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to start server',
        isLoading: false
      })
    }
  },

  stopServer: async () => {
    set({ isLoading: true, error: null })

    try {
      await window.electron.ipcRenderer.invoke('server:stop' as IPCChannel)
      set({
        serverRunning: false,
        isLoading: false
      })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to stop server',
        isLoading: false
      })
    }
  }
}))

// ============================================================================
// MARK: Event Listeners
// ============================================================================

/**
 * Listen for graph update events from main process
 */
export function setupProjectEventListeners(): void {
  console.log('[Renderer] Setting up project event listeners')

  // Listen for graph updates
  window.electron.ipcRenderer.on('graph:update', (_event, data: { graph: SpecGraphData }) => {
    console.log('[Renderer] Received graph:update event with', data.graph.nodes.length, 'nodes')
    useProjectStore.getState().setGraph(data.graph)
    console.log('[Renderer] Graph state updated in store')
    console.log('[Renderer] Current project path:', useProjectStore.getState().rootPath)
  })

  // Listen for file changes
  window.electron.ipcRenderer.on(
    'file:changed',
    (_event, data: { filePath: string; content: string }) => {
      console.log('File changed:', data.filePath)
    }
  )

  // Listen for server ready
  window.electron.ipcRenderer.on(
    'server:ready',
    (_event, data: { wsPort: number; httpPort: number }) => {
      console.log('Server ready:', data)
      // Update store state directly using setState
      useProjectStore.setState({
        serverRunning: true,
        wsPort: data.wsPort,
        httpPort: data.httpPort
      })
    }
  )
}
