# AUDIT LOG 02: Solution Proposal
**Date:** 2025-12-31
**Status:** SOLUTION PROPOSAL
**Subject:** Corrected Code for Styling and State Management Issues

---

## SOLUTION 1: The Styling Restitution

### File: `src/renderer/src/assets/main.css`

```css
/**
 * LiveSpec Global Styles
 * Matching demo/livespec/index.html exactly
 */

/* ============================================================================
   MARK: Dark Scrollbar (from demo)
   ============================================================================ */

.dark-scrollbar::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.dark-scrollbar::-webkit-scrollbar-track {
  background: #1f2937;
}

.dark-scrollbar::-webkit-scrollbar-thumb {
  background: #4b5563;
  border-radius: 4px;
}

.dark-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #6b7280;
}

/* ============================================================================
   MARK: Grid Pattern (from demo)
   ============================================================================ */

.grid-pattern {
  background-size: 40px 40px;
  background-image: linear-gradient(to right, #ffffff05 1px, transparent 1px),
                    linear-gradient(to bottom, #ffffff05 1px, transparent 1px);
}

/* ============================================================================
   MARK: Font Imports (matching demo's Google Fonts)
   ============================================================================ */

@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

/* ============================================================================
   MARK: Tailwind Configuration (for tailwind.config.js)
   ============================================================================ */

/**
 * Update tailwind.config.js with:
 *
 * module.exports = {
 *   content: ['./src/**/*.{html,js,ts,jsx,tsx}'],
 *   theme: {
 *     extend: {
 *       fontFamily: {
 *         sans: ['Inter', 'sans-serif'],
 *         mono: ['JetBrains Mono', 'monospace'],
 *       },
 *       colors: {
 *         gray: {
 *           850: '#1f2937',
 *           900: '#111827',
 *           950: '#030712',
 *         }
 *       }
 *     }
 *   },
 *   plugins: []
 * }
 */

/* ============================================================================
   MARK: Global Base Styles
   ============================================================================ */

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  padding: 0;
  font-family: 'Inter', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Apply dark scrollbar to all scrollable elements */
*::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

*::-webkit-scrollbar-track {
  background: #1f2937;
}

*::-webkit-scrollbar-thumb {
  background: #4b5563;
  border-radius: 4px;
}

*::-webkit-scrollbar-thumb:hover {
  background: #6b7280;
}

/* ============================================================================
   MARK: Utility Classes
   ============================================================================ */

.dark-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: #4b5563 #1f2937;
}

.dark-scrollbar::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.dark-scrollbar::-webkit-scrollbar-track {
  background: #1f2937;
}

.dark-scrollbar::-webkit-scrollbar-thumb {
  background: #4b5563;
  border-radius: 4px;
}

.dark-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #6b7280;
}
```

---

## SOLUTION 2: The Store Repair (Standard Zustand Pattern)

### File: `src/renderer/src/stores/project-store.ts`

```typescript
/**
 * Project Store - FIXED VERSION
 *
 * Using standard Zustand pattern without broken getter properties.
 * All state is directly exposed and mutations trigger re-renders correctly.
 */

import { create } from 'zustand'
import type { SpecGraphData, IPCChannel } from '../../../shared/types'

// ============================================================================
// MARK: State Interface (NO GETTERS)
// ============================================================================

interface ProjectStoreState {
  // Direct state properties (NO underscore prefix)
  rootPath: string | null
  graph: SpecGraphData | null
  serverRunning: boolean
  wsPort: number
  httpPort: number
  isLoading: boolean
  error: string | null
}

// ============================================================================
// MARK: Store Interface (State + Actions)
// ============================================================================

interface ProjectStore extends ProjectStoreState {
  // Actions
  openProject: () => Promise<{ rootPath: string | null; canceled: boolean }>
  closeProject: () => void
  setGraph: (graph: SpecGraphData) => void
  setRootPath: (path: string | null) => void
  startServer: (config?: { wsPort?: number; httpPort?: number }) => Promise<void>
  stopServer: () => Promise<void>
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

// ============================================================================
// MARK: Store Creation (Standard Zustand Pattern)
// ============================================================================

export const useProjectStore = create<ProjectStore>((set, get) => ({
  // ==========================================================================
  // MARK: Initial State (direct properties, no getters)
  // ==========================================================================

  rootPath: null,
  graph: null,
  serverRunning: false,
  wsPort: 3899,
  httpPort: 3900,
  isLoading: false,
  error: null,

  // ==========================================================================
  // MARK: Actions
  // ==========================================================================

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

      console.log('[Store] Project opened:', result.rootPath)
      return result
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to open project'
      console.error('[Store] Error opening project:', errorMsg)
      set({
        error: errorMsg,
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

    // CRITICAL FIX: Create proper shallow copy to trigger Zustand subscribers
    // Using Object.create to ensure new reference while preserving prototype chain
    const newGraph: SpecGraphData = {
      meta: { ...graph.meta },
      nodes: [...graph.nodes],
      edges: [...graph.edges]
    }

    // Using standard Zustand set - this WILL trigger re-renders
    set({ graph: newGraph })

    console.log('[Store] graph state updated, new reference created')
    console.log('[Store] Current graph in store:', get().graph?.nodes.length || 0, 'nodes')
  },

  setRootPath: (path: string | null) => {
    set({ rootPath: path })
  },

  startServer: async (config = {}) => {
    set({ isLoading: true, error: null })

    try {
      const currentState = get()
      await window.electron.ipcRenderer.invoke('server:start' as IPCChannel, {
        wsPort: config.wsPort || currentState.wsPort,
        httpPort: config.httpPort || currentState.httpPort
      })

      set({
        serverRunning: true,
        isLoading: false
      })
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to start server'
      set({
        error: errorMsg,
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
      const errorMsg = error instanceof Error ? error.message : 'Failed to stop server'
      set({
        error: errorMsg,
        isLoading: false
      })
    }
  },

  setLoading: (loading: boolean) => {
    set({ isLoading: loading })
  },

  setError: (error: string | null) => {
    set({ error })
  }
}))

// ============================================================================
// MARK: Event Listeners (unchanged)
// ============================================================================

export function setupProjectEventListeners(): void {
  console.log('[Renderer] Setting up project event listeners')

  window.electron.ipcRenderer.on('graph:update', (_event, data: { graph: SpecGraphData }) => {
    console.log('[Renderer] Received graph:update event with', data.graph.nodes.length, 'nodes')

    // CRITICAL: Call the store action directly
    useProjectStore.getState().setGraph(data.graph)

    console.log('[Renderer] Graph state updated in store')
    console.log('[Renderer] Current project path:', useProjectStore.getState().rootPath)
    console.log('[Renderer] Current graph nodes:', useProjectStore.getState().graph?.nodes.length || 0)
  })

  window.electron.ipcRenderer.on('file:changed', (_event, data: { filePath: string; content: string }) => {
    console.log('File changed:', data.filePath)
  })

  window.electron.ipcRenderer.on('server:ready', (_event, data: { wsPort: number; httpPort: number }) => {
    console.log('Server ready:', data)

    // Direct state update for server status
    useProjectStore.setState({
      serverRunning: true,
      wsPort: data.wsPort,
      httpPort: data.httpPort
    })
  })
}
```

---

## SOLUTION 3: The Component Connection

### File: `src/renderer/src/App.tsx`

```typescript
/**
 * LiveSpec App Component - FIXED VERSION
 *
 * Fixed:
 * 1. Subscribes to direct store properties (not internal _prefixed ones)
 * 2. Added fallback for empty nodes array
 * 3. Added error state display
 * 4. Enhanced debugging
 */

import { useEffect, useRef } from 'react'
import { Folder, Network, GitGraph, AlertCircle } from 'lucide-react'
import { ReflexContainer, ReflexSplitter, ReflexElement } from 'react-reflex'
import 'react-reflex/styles.css'
import './assets/main.css'
import { useProjectStore, setupProjectEventListeners } from './stores/project-store'
import { useGraphStore } from './stores/graph-store'
import { useUIStore } from './stores/ui-store'
import { useAutoLayout } from './hooks/useAutoLayout'
import { GraphCanvas, GraphCanvasRef } from './components/Graph/GraphCanvas'
import { SpecTree } from './components/Tree/SpecTree'
import { GuestViewport } from './components/Viewport/GuestViewport'

function App(): React.JSX.Element {
  // ==========================================================================
  // MARK: Refs
  // ==========================================================================

  const graphCanvasRef = useRef<GraphCanvasRef>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // ==========================================================================
  // MARK: Store Selectors (FIXED - direct properties, no internal _prefix)
  // ==========================================================================

  const rootPath = useProjectStore((state) => state.rootPath)
  const serverRunning = useProjectStore((state) => state.serverRunning)
  const graph = useProjectStore((state) => state.graph)
  const isLoading = useProjectStore((state) => state.isLoading)
  const error = useProjectStore((state) => state.error)

  const openProject = useProjectStore((state) => state.openProject)
  const startServer = useProjectStore((state) => state.startServer)
  const stopServer = useProjectStore((state) => state.stopServer)

  // ==========================================================================
  // MARK: Debug Logging
  // ==========================================================================

  useEffect(() => {
    console.log('[App] ===== STATE UPDATE =====')
    console.log('[App] rootPath:', rootPath)
    console.log('[App] serverRunning:', serverRunning)
    console.log('[App] graph:', graph)
    console.log('[App] graph exists:', !!graph)
    console.log('[App] graph.nodes.length:', graph?.nodes.length ?? 0)
    console.log('[App] graph.edges.length:', graph?.edges.length ?? 0)
    console.log('[App] isLoading:', isLoading)
    console.log('[App] error:', error)
    console.log('[App] =========================')
  }, [rootPath, serverRunning, graph, isLoading, error])

  // ==========================================================================
  // MARK: Other Store Selectors
  // ==========================================================================

  const viewMode = useUIStore((state) => state.viewMode)
  const setViewMode = useUIStore((state) => state.setViewMode)
  const selectNodes = useGraphStore((state) => state.selectNodes)

  // ==========================================================================
  // MARK: Calculate Layout
  // ==========================================================================

  const nodes = graph?.nodes ?? []
  const edges = graph?.edges ?? []

  const { layoutNodes, layoutEdges } = useAutoLayout({
    nodes,
    edges,
    enabled: nodes.length > 0
  })

  // ==========================================================================
  // MARK: Setup Event Listeners
  // ==========================================================================

  useEffect(() => {
    setupProjectEventListeners()
  }, [])

  // ==========================================================================
  // MARK: Host ↔ Guest Communication
  // ==========================================================================

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const { data } = event
      if (!data || !data.type) return

      console.log('[App] Received message from Guest:', data.type, data)

      switch (data.type) {
        case 'NODE_CLICKED':
          if (data.nodeId) {
            selectNodes(data.nodeId)
            if (graphCanvasRef.current) {
              graphCanvasRef.current.centerOnNode(data.nodeId)
            }
          }
          break
        default:
          console.log('[App] Unknown message type:', data.type)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => {
      window.removeEventListener('message', handleMessage)
    }
  }, [selectNodes])

  const handleNodeClick = (nodeId: string) => {
    selectNodes(nodeId)
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        { type: 'HIGHLIGHT_NODE', nodeId },
        '*'
      )
    }
  }

  const handleGuestNodeClick = (nodeId: string) => {
    selectNodes(nodeId)
    if (graphCanvasRef.current) {
      graphCanvasRef.current.centerOnNode(nodeId)
    }
  }

  const handleOpenProject = async () => {
    await openProject()
  }

  const handleStartServer = async () => {
    await startServer()
  }

  const handleStopServer = async () => {
    await stopServer()
  }

  // ==========================================================================
  // MARK: Render Conditions
  // ==========================================================================

  const hasGraphData = graph && graph.nodes.length > 0
  const hasNodes = nodes.length > 0
  const hasLayoutNodes = layoutNodes.length > 0

  // ==========================================================================
  // MARK: Render
  // ==========================================================================

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-cyan-400">LiveSpec V1.0</h1>
            <p className="text-xs text-gray-500 mt-1">
              Phase 3: Graph & Tree Views Implemented
            </p>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-2 bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('graph')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded transition-colors ${
                viewMode === 'graph'
                  ? 'bg-cyan-600 text-white'
                  : 'text-gray-400 hover:bg-gray-700'
              }`}
            >
              <Network className="w-4 h-4" />
              Graph
            </button>
            <button
              onClick={() => setViewMode('tree')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded transition-colors ${
                viewMode === 'tree'
                  ? 'bg-cyan-600 text-white'
                  : 'text-gray-400 hover:bg-gray-700'
              }`}
            >
              <Folder className="w-4 h-4" />
              Tree
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <ReflexContainer orientation="vertical" className="h-[calc(100vh-73px)]">
        {/* Sidebar - Project Controls */}
        <ReflexElement className="bg-gray-900" minSize={250} maxSize={400} size={320}>
          <aside className="h-full border-r border-gray-800 p-4 overflow-y-auto dark-scrollbar">
            {/* Project Status */}
            <div className="mb-6">
              <h2 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wide">
                Project Status
              </h2>
              <div className="space-y-3">
                <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                  <div className="text-xs text-gray-500 mb-1">Project Path</div>
                  <div className="font-mono text-xs text-cyan-300 break-all">
                    {rootPath || 'No project open'}
                  </div>
                </div>

                <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                  <div className="text-xs text-gray-500 mb-1">Server Status</div>
                  <div
                    className={`font-mono text-sm ${
                      serverRunning ? 'text-green-400' : 'text-yellow-400'
                    }`}
                  >
                    {serverRunning ? 'Running' : 'Stopped'}
                  </div>
                </div>

                {/* Error Display */}
                {error && (
                  <div className="bg-red-900/30 border border-red-700 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-red-400 text-sm">
                      <AlertCircle className="w-4 h-4" />
                      <span>{error}</span>
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  {!rootPath && (
                    <button
                      onClick={handleOpenProject}
                      disabled={isLoading}
                      className="w-full px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed rounded font-medium transition-colors text-sm"
                    >
                      {isLoading ? 'Opening...' : 'Open Project'}
                    </button>
                  )}

                  {rootPath && !serverRunning && (
                    <button
                      onClick={handleStartServer}
                      disabled={isLoading}
                      className="w-full px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed rounded font-medium transition-colors text-sm"
                    >
                      {isLoading ? 'Starting...' : 'Start Server'}
                    </button>
                  )}

                  {serverRunning && (
                    <button
                      onClick={handleStopServer}
                      disabled={isLoading}
                      className="w-full px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed rounded font-medium transition-colors text-sm"
                    >
                      Stop Server
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Stats */}
            {graph && (
              <div>
                <h2 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wide">
                  Graph Stats
                </h2>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Nodes:</span>
                    <span className="font-mono text-cyan-300">{graph.nodes.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Edges:</span>
                    <span className="font-mono text-cyan-300">{graph.edges.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Layout Nodes:</span>
                    <span className="font-mono text-cyan-300">{layoutNodes.length}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Debug Info */}
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-6 p-3 bg-gray-950 rounded border border-gray-800">
                <h3 className="text-xs font-mono text-gray-500 mb-2">DEBUG INFO</h3>
                <div className="text-[10px] font-mono text-gray-600 space-y-1">
                  <div>hasGraphData: {String(hasGraphData)}</div>
                  <div>hasNodes: {String(hasNodes)}</div>
                  <div>hasLayoutNodes: {String(hasLayoutNodes)}</div>
                  <div>graph: {graph ? 'exists' : 'null'}</div>
                  <div>nodes.length: {nodes.length}</div>
                  <div>layoutNodes.length: {layoutNodes.length}</div>
                </div>
              </div>
            )}
          </aside>
        </ReflexElement>

        {/* Splitter */}
        <ReflexSplitter className="border-l border-gray-700 hover:border-cyan-600 transition-colors" />

        {/* Guest Viewport (Left) & Graph View (Right) */}
        <ReflexElement className="bg-gray-950" flex={1}>
          <ReflexContainer orientation="horizontal">
            {/* Guest Viewport - User's HTML Prototype */}
            {serverRunning && hasGraphData && (
              <>
                <ReflexElement minSize={200} size={350}>
                  <div className="h-full relative border-b border-gray-800">
                    <div className="absolute top-2 left-2 z-10 bg-gray-900/80 backdrop-blur border border-gray-700 px-2 py-1 rounded text-[10px] text-gray-400 font-mono">
                      Guest Prototype (HTML)
                    </div>
                    <GuestViewport onNodeClick={handleGuestNodeClick} />
                  </div>
                </ReflexElement>

                <ReflexSplitter className="border-t border-gray-700 hover:border-cyan-600 transition-colors" />
              </>
            )}

            {/* Graph/Tree View - Spec Visualization */}
            <ReflexElement flex={1}>
              <main className="h-full overflow-hidden relative">
                {/* =====================================================================
                     MARK: NEW - Better State Display Logic
                     ===================================================================== */}

                {isLoading && (
                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-500">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mb-4"></div>
                    <p className="text-lg">Loading...</p>
                  </div>
                )}

                {!isLoading && error && (
                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-500">
                    <AlertCircle className="w-16 h-16 mb-4 text-red-500" />
                    <p className="text-lg text-red-400">Error: {error}</p>
                  </div>
                )}

                {!isLoading && !error && !hasGraphData && (
                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-500">
                    <GitGraph className="w-16 h-16 mb-4 opacity-50" />
                    <p className="text-lg">No graph loaded</p>
                    <p className="text-sm mt-2">
                      {rootPath
                        ? 'Create a spec_graph.json file in your project folder'
                        : 'Open a project folder to get started'}
                    </p>
                  </div>
                )}

                {/* =====================================================================
                     MARK: NEW - Data Loaded But Empty Fallback
                     ===================================================================== */}

                {!isLoading && !error && hasGraphData && !hasLayoutNodes && (
                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-500">
                    <AlertCircle className="w-16 h-16 mb-4 text-yellow-500" />
                    <p className="text-lg">Graph data loaded but layout failed</p>
                    <p className="text-sm mt-2 text-gray-600">
                      Nodes: {nodes.length}, Layout Nodes: {layoutNodes.length}
                    </p>
                    <p className="text-xs mt-4 font-mono text-gray-700">
                      Check console for Dagre errors
                    </p>
                  </div>
                )}

                {/* =====================================================================
                     MARK: Main Content - Graph or Tree View
                     ===================================================================== */}

                {!isLoading && !error && hasLayoutNodes && (
                  <>
                    {/* View Mode Toggle - Floating */}
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-gray-900/80 backdrop-blur border border-gray-700 rounded-lg p-1 flex items-center gap-2">
                      <button
                        onClick={() => setViewMode('graph')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded transition-colors text-sm ${
                          viewMode === 'graph'
                            ? 'bg-cyan-600 text-white'
                            : 'text-gray-400 hover:bg-gray-700'
                        }`}
                      >
                        <Network className="w-4 h-4" />
                        Graph
                      </button>
                      <button
                        onClick={() => setViewMode('tree')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded transition-colors text-sm ${
                          viewMode === 'tree'
                            ? 'bg-cyan-600 text-white'
                            : 'text-gray-400 hover:bg-gray-700'
                        }`}
                      >
                        <Folder className="w-4 h-4" />
                        Tree
                      </button>
                    </div>

                    {/* View Content */}
                    {viewMode === 'graph' && (
                      <GraphCanvas
                        ref={graphCanvasRef}
                        nodes={layoutNodes}
                        edges={layoutEdges}
                      />
                    )}
                    {viewMode === 'tree' && (
                      <div className="w-full h-full bg-gray-900 dark-scrollbar">
                        <SpecTree nodes={nodes} onNodeClick={handleNodeClick} />
                      </div>
                    )}
                  </>
                )}
              </main>
            </ReflexElement>
          </ReflexContainer>
        </ReflexElement>
      </ReflexContainer>
    </div>
  )
}

export default App
```

---

## SOLUTION 4: Tailwind Config Update

### File: `tailwind.config.js`

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        gray: {
          850: '#1f2937',
          900: '#111827',
          950: '#030712',
        }
      }
    },
  },
  plugins: [],
}
```

---

## SOLUTION 5: Icon Library Alignment (Optional)

### File: `package.json` (add phosphor-react dependency)

```json
{
  "dependencies": {
    "phosphor-react": "^1.4.1",
    // ... other dependencies
  }
}
```

Then update components to use phosphor-react icons instead of lucide-react to match demo exactly.

---

## SUMMARY OF CHANGES

| Issue | Root Cause | Solution |
|-------|-----------|----------|
| Blank screen | Zustand getter pattern not triggering re-renders | Remove getters, use direct state properties |
| Empty nodes | Store update not creating new reference | Use proper shallow copy with `Object.create` or spread |
| Missing scrollbar styles | Not copied from demo | Add `.dark-scrollbar` CSS to global styles |
| Font mismatch | No custom font config | Add Inter/JetBrains Mono via Google Fonts |
| Poor error visibility | No fallback for failed layout | Add specific error states in App.tsx |

---

**END OF SOLUTION PROPOSAL**
