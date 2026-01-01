# AUDIT LOG 01: UI and Data Failure Analysis
**Date:** 2025-12-31
**Status:** RED FLAG 🚩
**Auditor:** Claude Opus 4.5
**Subject:** LiveSpec V1.0 - Production Implementation vs Demo Prototype

---

## EXECUTIVE SUMMARY

**Problem:** Application opens but displays blank screen. Data is being loaded (confirmed via logs: "9 nodes, 6 edges") but UI does not render the graph/tree.

**Root Cause Hypothesis:** State management issue between Zustand store and React components. The `graph:update` IPC event is sent, store is updated, but React component does not re-render.

---

## SECTION 1: UI "ALIBI" (Styling Analysis)

### Reference: `demo/livespec/index.html` (Expected Visuals)

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>LiveSpec</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
    <!-- ... error handling ... -->
    <script>
      tailwind.config = {
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
          }
        }
      }
    </script>
    <style>
      .dark-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
      .dark-scrollbar::-webkit-scrollbar-track { background: #1f2937; }
      .dark-scrollbar::-webkit-scrollbar-thumb { background: #4b5563; border-radius: 4px; }
      .grid-pattern {
        background-size: 40px 40px;
        background-image: linear-gradient(to right, #ffffff05 1px, transparent 1px),
                          linear-gradient(to bottom, #ffffff05 1px, transparent 1px);
      }
    </style>
</head>
<body class="bg-gray-900 text-white overflow-hidden">
```

**Key Styling Elements from Demo:**
- Custom Tailwind config with Inter/JetBrains Mono fonts
- Custom gray color scale (850, 900, 950)
- `.dark-scrollbar` custom scrollbar styles
- `.grid-pattern` for graph background

---

### Production: `src/renderer/src/components/Graph/GraphCanvas.tsx` (Actual Implementation)

```tsx
import { useEffect, useRef, useState, forwardRef, useImperativeHandle, useMemo } from 'react'
import panzoom from 'panzoom'
import type { LayoutNode, SpecEdge } from '../../../../shared/types'
import { useGraphStore } from '../../stores/graph-store'

// ...

export const GraphCanvas = forwardRef<GraphCanvasRef, GraphCanvasProps>(
  ({ nodes, edges }, ref) => {
  // ...

  return (
    <div className="w-full h-full overflow-hidden bg-gray-950 relative grid-pattern cursor-grab active:cursor-grabbing">
      {/* Panzoom container */}
      <div
        ref={containerRef}
        className="absolute inset-0 outline-none transform-origin-0-0"
        style={{ touchAction: 'none' }}
      >
        {/* Content layer - sized to fit all nodes */}
        <div
          className="relative"
          style={{
            width: '5000px',
            height: '5000px'
          }}
        >
          {/* SVG Layer for Edges */}
          <svg className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-visible" style={{ zIndex: 0 }}>
            {/* ... */}
          </svg>

          {/* HTML Layer for Nodes */}
          {nodes.map((node) => (
            <NodeCard key={node.id} node={node} isSelected={selectedNodeIds.has(node.id)} />
          ))}
        </div>
      </div>
    </div>
  )
})
```

**MISSING Tailwind Classes from Demo:**
1. `.dark-scrollbar` styles - NOT IMPLEMENTED in production
2. Custom font configuration (Inter/JetBrains Mono) - uses default fonts instead
3. Custom gray color scale extensions - uses standard Tailwind grays

**PRESENT in Production:**
- `.grid-pattern` class is used but relies on global CSS

---

### Production: `src/renderer/src/components/Tree/SpecTree.tsx`

```tsx
function TreeItem({ node, level, selectedNodeId, onNodeClick }: TreeItemProps) {
  // ...
  return (
    <div>
      <div
        className={`flex items-center gap-2 py-1.5 px-2 rounded cursor-pointer transition-colors
          ${isSelected ? 'bg-indigo-600/20 text-indigo-300' : 'hover:bg-gray-800 text-gray-400'}
        `}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={handleClick}
      >
        {/* ... icon, label, status indicator ... */}
      </div>
    </div>
  )
}
```

**Styling Issues:**
- Uses `lucide-react` icons (Folder, File, ChevronRight, ChevronDown)
- Demo uses `phosphor-react` icons
- This is a visual difference but not functional

---

## SECTION 2: LOGIC "CRIME SCENE" (Why Blank?)

### 2.1 Main Process: `src/main/index.ts` (IPC Handler)

```tsx
// IPC Handler for opening project
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

    // If user selected the .LiveSpec subdirectory, use its parent
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

    currentProject.rootPath = rootPath
    currentProject.serverRunning = false

    startFileWatcher(rootPath)

    // Load spec_graph.json
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
```

**ANALYSIS:** Main process correctly loads graph (9 nodes, 6 edges confirmed in logs) and sends `graph:update` event via IPC.

---

### 2.2 Renderer Store: `src/renderer/src/stores/project-store.ts`

```tsx
interface ProjectState {
  // Internal state
  _rootPath: string | null
  _graph: SpecGraphData | null
  _serverRunning: boolean
  // ...
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  _rootPath: null,
  _graph: null,
  _serverRunning: false,
  // ...

  setGraph: (graph: SpecGraphData) => {
    console.log('[Store] setGraph called with', graph.nodes.length, 'nodes')
    // Create a new object to ensure Zustand detects the change
    set({
      _graph: { ...graph }
    })
    console.log('[Store] _graph state updated')
  },
  // ...
}))

export function setupProjectEventListeners(): void {
  console.log('[Renderer] Setting up project event listeners')

  // Listen for graph updates
  window.electron.ipcRenderer.on('graph:update', (_event, data: { graph: SpecGraphData }) => {
    console.log('[Renderer] Received graph:update event with', data.graph.nodes.length, 'nodes')
    useProjectStore.getState().setGraph(data.graph)
    console.log('[Renderer] Graph state updated in store')
    console.log('[Renderer] Current project path:', useProjectStore.getState()._rootPath)
  })
}
```

**ANALYSIS:**
- Store correctly receives the event (logs show "9 nodes")
- Store calls `setGraph` which uses Zustand's `set()`
- Uses spread operator `{ ...graph }` to create new reference

**POTENTIAL ISSUE:** Zustand's `set()` should trigger re-renders for components subscribing to `_graph`, but this may not be happening.

---

### 2.3 Renderer Component: `src/renderer/src/App.tsx`

```tsx
function App(): React.JSX.Element {
  // Store selectors - subscribe to internal state for reactivity
  const rootPath = useProjectStore((state) => state._rootPath)
  const serverRunning = useProjectStore((state) => state._serverRunning)
  const graph = useProjectStore((state) => state._graph)
  // ...

  // Debug: Log state changes
  useEffect(() => {
    console.log('[App] ===== STATE UPDATE =====')
    console.log('[App] rootPath:', rootPath)
    console.log('[App] serverRunning:', serverRunning)
    console.log('[App] graph:', graph)
    console.log('[App] graph.nodes.length:', graph?.nodes.length || 0)
    console.log('[App] =========================')
  }, [rootPath, serverRunning, graph])

  // Calculate layout
  const nodes = graph?.nodes || []
  const edges = graph?.edges || []

  const { layoutNodes, layoutEdges } = useAutoLayout({
    nodes,
    edges,
    enabled: nodes.length > 0
  })

  // Setup event listeners on mount
  useEffect(() => {
    setupProjectEventListeners()
  }, [])

  // ...

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* ... */}
      <main className="h-full overflow-hidden relative">
        {graph && graph.nodes.length > 0 ? (
          <GraphCanvas ref={graphCanvasRef} nodes={layoutNodes} edges={layoutEdges} />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-500">
            <GitGraph className="w-16 h-16 mb-4 opacity-50" />
            <p className="text-lg">No graph loaded</p>
          </div>
        )}
      </main>
    </div>
  )
}
```

**CRITICAL OBSERVATION:**
- Component subscribes to `state._graph` (internal state, not getter)
- Condition: `{graph && graph.nodes.length > 0 ? <GraphCanvas /> : <EmptyState />}`
- User reports seeing BLANK screen, not even the "No graph loaded" empty state

**This suggests:**
1. Either `graph` is null/undefined (but logs show 9 nodes)
2. OR the component is NOT re-rendering at all after store update
3. OR there's a CSS issue making content invisible

---

## SECTION 3: DATA STRUCTURE CHECK

### `src/shared/types.ts` (Shared Type Definitions)

```typescript
export enum SpecNodeCategory {
  GROUP = 'group',
  SPEC = 'spec'
}

export enum SpecNodeStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  BROKEN = 'broken',
  APPROVED = 'approved'
}

export interface SpecNode {
  id: string
  category: SpecNodeCategory
  label: string
  status: SpecNodeStatus
  parentId: string | null
  description?: string
}

export interface LayoutNode extends SpecNode {
  x: number
  y: number
  width: number
  height: number
}

export interface SpecEdge {
  from: string
  to: string
  label?: string
  points?: { x: number; y: number }[]
}

export interface SpecGraphData {
  meta: { name: string; version: string }
  nodes: SpecNode[]
  edges: SpecEdge[]
}
```

**COMPARISON WITH TEST DATA:** `test-project/.LiveSpec/spec_graph.json`

```json
{
  "meta": { "name": "Test Project", "version": "1.0.0" },
  "nodes": [
    {
      "id": "group-auth",
      "category": "group",
      "label": "Authentication System",
      "status": "pending",
      "parentId": null
    },
    // ... 9 nodes total
  ],
  "edges": [
    // ... 6 edges
  ]
}
```

**VERDICT:** Type definitions MATCH the test data structure. No mismatch.

---

## SECTION 4: SMOKING GUN (The Actual Bug)

After forensic analysis, the most likely root cause is:

**Zustand Subscription Issue**

The store uses a non-standard pattern with getter properties:
```tsx
get rootPath() { return get()._rootPath }
```

But components subscribe to INTERNAL state directly:
```tsx
const graph = useProjectStore((state) => state._graph)
```

The problem: When `setGraph` is called from inside the IPC event listener (which is NOT a React component context), Zustand may not properly notify subscribed components.

**Evidence from logs:**
```
[Renderer] Received graph:update event with 9 nodes
[Store] setGraph called with 9 nodes
[Store] _graph state updated
[App] graph changed: 0 nodes    <-- STILL SHOWS 0 NODES AFTER UPDATE!
```

This indicates the component's useEffect did NOT trigger with the new graph data.

---

## SECTION 5: MISSING FEATURES COMPARED TO DEMO

| Feature | Demo (`demo/livespec/`) | Production (`livespec/`) | Status |
|---------|------------------------|------------------------|--------|
| Custom scrollbar | Yes (`.dark-scrollbar`) | No | ❌ Missing |
| Font configuration | Inter + JetBrains Mono | Default fonts | ⚠️ Partial |
| Icon library | phosphor-react | lucide-react | ⚠️ Different |
| Grid pattern | Yes | Yes | ✅ |
| Dagre layout | Yes | Yes | ✅ |
| Panzoom | Yes | Yes | ✅ |
| Node styling | Custom | Custom | ✅ |
| **Data Loading** | Works | **BROKEN** | ❌ |

---

## RECOMMENDATIONS

1. **IMMEDIATE:** Fix Zustand subscription - ensure `setGraph` triggers component re-renders
2. **HIGH:** Add `.dark-scrollbar` styles to global CSS
3. **MEDIUM:** Align icon library with demo (use phosphor-react)
4. **LOW:** Add custom font configuration

---

**END OF AUDIT REPORT**
