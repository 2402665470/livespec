import { useEffect, useRef, useState } from 'react'
import { Graph, TreeStructure, FolderOpen, Play, Stop } from 'phosphor-react'
import { ReflexContainer, ReflexSplitter, ReflexElement } from 'react-reflex'
import 'react-reflex/styles.css'
import './assets/app.css'
import { useProjectStore, setupProjectEventListeners } from './stores/project-store'
import { useGraphStore } from './stores/graph-store'
import { useAutoLayout } from './hooks/useAutoLayout'
import { GraphCanvas, GraphCanvasRef } from './components/Graph/GraphCanvas'
import { SpecTree } from './components/Tree/SpecTree'
import { GuestViewport } from './components/Viewport/GuestViewport'

function App(): React.JSX.Element {
  // Local state for view mode (Tab switching)
  const [viewMode, setViewMode] = useState<'graph' | 'tree'>('graph')

  // Refs
  const graphCanvasRef = useRef<GraphCanvasRef>(null)

  // Store selectors
  const rootPath = useProjectStore((state) => state.rootPath)
  const serverRunning = useProjectStore((state) => state.serverRunning)
  const graph = useProjectStore((state) => state.graph)
  const openProject = useProjectStore((state) => state.openProject)
  const startServer = useProjectStore((state) => state.startServer)
  const stopServer = useProjectStore((state) => state.stopServer)

  // Debug logging
  useEffect(() => {
    console.log('[App] ===== STATE UPDATE =====')
    console.log('[App] rootPath:', rootPath)
    console.log('[App] serverRunning:', serverRunning)
    console.log('[App] graph:', graph)
    console.log('[App] graph.nodes.length:', graph?.nodes.length || 0)
    console.log('[App] =========================')
  }, [rootPath, serverRunning, graph])

  const selectNodes = useGraphStore((state) => state.selectNodes)

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

  // Host <-> Guest Communication
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
    // Broadcast highlight message to all windows (iframe will pick it up)
    window.postMessage({ type: 'HIGHLIGHT_NODE', nodeId }, '*')
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

  // Computed flags
  const hasGraphData = graph && graph.nodes.length > 0

  // Extract project name from path for display
  const projectName = rootPath ? rootPath.split(/[/\\]/).filter(Boolean).pop() || 'LiveSpec' : 'LiveSpec'

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-gray-900">
      {/* ================================================================== */}
      {/* TOP HEADER */}
      {/* ================================================================== */}
      <header className="h-16 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-6 shrink-0 z-20 relative">
        {/* Left: App Name + Version */}
        <div className="flex items-center space-x-4">
          <div className="flex flex-col">
            <h1 className="font-semibold text-lg text-gray-100 tracking-tight leading-none">{projectName}</h1>
            <span className="text-xs text-gray-500 font-mono mt-1">V1.0</span>
          </div>
        </div>

        {/* Center: Project Controls */}
        <div className="flex items-center space-x-3">
          {/* Server Status Badge */}
          <div className="flex items-center space-x-2 px-3 py-1.5 bg-gray-950 rounded-lg border border-gray-800">
            <span className={`w-2 h-2 rounded-full ${serverRunning ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
            <span className={`text-xs font-mono ${serverRunning ? 'text-green-400' : 'text-yellow-400'}`}>
              {serverRunning ? 'Running' : 'Stopped'}
            </span>
          </div>

          {/* Control Buttons */}
          {!rootPath && (
            <button
              onClick={handleOpenProject}
              className="flex items-center gap-2 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 rounded transition-colors text-sm font-medium text-gray-100"
            >
              <FolderOpen size={16} weight="regular" />
              Open Project
            </button>
          )}

          {rootPath && !serverRunning && (
            <button
              onClick={handleStartServer}
              className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-500 rounded transition-colors text-sm font-medium text-gray-100"
            >
              <Play size={16} weight="regular" />
              Start Server
            </button>
          )}

          {serverRunning && (
            <button
              onClick={handleStopServer}
              className="flex items-center gap-2 px-3 py-1.5 bg-red-600 hover:bg-red-500 rounded transition-colors text-sm font-medium text-gray-100"
            >
              <Stop size={16} weight="regular" />
              Stop Server
            </button>
          )}

          {/* Stats */}
          {hasGraphData && (
            <div className="flex items-center space-x-3 px-3 py-1.5 bg-gray-950 rounded-lg border border-gray-800 text-xs">
              <span className="text-gray-500">Nodes:</span>
              <span className="font-mono text-cyan-400">{graph.nodes.length}</span>
              <span className="text-gray-600">|</span>
              <span className="text-gray-500">Edges:</span>
              <span className="font-mono text-cyan-400">{graph.edges.length}</span>
            </div>
          )}
        </div>

        {/* Right: View Mode Toggle (Tabs) */}
        {hasGraphData && (
          <div className="flex bg-gray-950 p-1 rounded-lg border border-gray-800">
            <button
              onClick={() => setViewMode('graph')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded transition-colors text-sm ${
                viewMode === 'graph'
                  ? 'bg-cyan-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800'
              }`}
            >
              <Graph size={16} weight="regular" />
              Graph
            </button>
            <button
              onClick={() => setViewMode('tree')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded transition-colors text-sm ${
                viewMode === 'tree'
                  ? 'bg-cyan-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800'
              }`}
            >
              <TreeStructure size={16} weight="regular" />
              Tree
            </button>
          </div>
        )}
      </header>

      {/* ================================================================== */}
      {/* MAIN SPLIT AREA */}
      {/* ================================================================== */}
      <div className="flex-1 h-full relative">
        <ReflexContainer orientation="vertical" className="h-full w-full">
          {/* LEFT PANE: GUEST VIEWPORT */}
          <ReflexElement className="bg-white" minSize={300} flex={0.6}>
            {serverRunning && hasGraphData ? (
              <GuestViewport onNodeClick={handleGuestNodeClick} />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-100">
                <div className="text-center text-gray-500">
                  <TreeStructure size={48} weight="thin" className="mb-3 mx-auto opacity-50" />
                  <p className="text-sm">
                    {!rootPath
                      ? 'Open a project to get started'
                      : 'No graph data - create spec_graph.json'}
                  </p>
                </div>
              </div>
            )}
          </ReflexElement>

          {/* Splitter */}
          <ReflexSplitter propagateAttributes={false} />

          {/* RIGHT PANE: GRAPH/TREE */}
          <ReflexElement className="bg-gray-950" minSize={300} flex={0.4}>
            {hasGraphData ? (
              viewMode === 'graph' ? (
                <GraphCanvas
                  ref={graphCanvasRef}
                  nodes={layoutNodes}
                  edges={layoutEdges}
                />
              ) : (
                <div className="w-full h-full bg-gray-900 overflow-y-auto">
                  <SpecTree nodes={nodes} onNodeClick={handleNodeClick} />
                </div>
              )
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-gray-500">
                <TreeStructure size={64} weight="thin" className="mb-4 opacity-50" />
                <p className="text-lg">No graph loaded</p>
                <p className="text-sm mt-2">
                  {rootPath
                    ? 'Create a spec_graph.json file in your project folder'
                    : 'Open a project folder to get started'}
                </p>
              </div>
            )}
          </ReflexElement>
        </ReflexContainer>
      </div>
    </div>
  )
}

export default App
