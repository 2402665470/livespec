/**
 * GraphCanvas Component
 *
 * Renders the spec graph using Dagre layout + Panzoom
 *
 * Features:
 * - Auto-layout using Dagre
 * - Pan/zoom using panzoom library
 * - Node cards with status colors
 * - Bezier curve edges
 * - Interactive selection
 */

import { useEffect, useRef, useState, forwardRef, useImperativeHandle, useMemo } from 'react'
import panzoom from 'panzoom'
import type { LayoutNode, SpecEdge } from '../../../../shared/types'
import { useGraphStore } from '../../stores/graph-store'

interface GraphCanvasProps {
  nodes: LayoutNode[]
  edges: SpecEdge[]
}

export interface GraphCanvasRef {
  centerOnNode: (nodeId: string) => void
}

// ============================================================================
// MARK: Helper Components
// ============================================================================

interface NodeCardProps {
  node: LayoutNode
  isSelected: boolean
  isHovered: boolean
  onClick: (nodeId: string) => void
  onHover: (nodeId: string | null) => void
}

function NodeCard({ node, isSelected, isHovered, onClick, onHover }: NodeCardProps) {
  const category = node.category
  const status = node.status

  // Calculate position (center the card on the node's x,y)
  const left = node.x - node.width / 2
  const top = node.y - node.height / 2

  // ============================================================================
  // MARK: Styling
  // ============================================================================

  // Group node styling
  if (category === 'group') {
    return (
      <div
        className={`absolute border-2 border-dashed rounded-xl transition-all cursor-pointer
          ${isSelected ? 'border-indigo-400 bg-indigo-900/20 z-10' : 'border-gray-700 bg-gray-900/50'}
          ${isHovered ? 'border-gray-600 bg-gray-900/60' : ''}
        `}
        style={{
          left,
          top,
          width: node.width,
          height: node.height,
          pointerEvents: 'auto'
        }}
        onClick={() => onClick(node.id)}
        onMouseEnter={() => onHover(node.id)}
        onMouseLeave={() => onHover(null)}
      >
        {/* Group label positioned at the top */}
        <div className="absolute -top-3 left-4 px-2 bg-gray-950 text-xs font-mono text-gray-500 border border-gray-800 rounded">
          {node.label}
        </div>

        {/* Child count indicator */}
        {node.description && (
          <div className="absolute bottom-2 right-2 text-[10px] text-gray-600 font-mono">
            {node.description}
          </div>
        )}
      </div>
    )
  }

  // Spec node styling
  const statusColors = {
    pending: 'border-l-yellow-500',
    verified: 'border-l-green-500',
    broken: 'border-l-red-500',
    approved: 'border-l-blue-500'
  }

  const statusBorder = statusColors[status] || statusColors.pending

  return (
    <div
      className={`absolute rounded shadow-lg flex flex-col justify-center items-center px-4 transition-all cursor-pointer
        border-l-4 ${statusBorder}
        ${isSelected ? 'bg-gray-700 ring-2 ring-indigo-500 z-10 scale-105' : 'bg-gray-800 hover:bg-gray-750'}
        ${isHovered ? 'ring-1 ring-gray-600' : ''}
      `}
      style={{
        left,
        top,
        width: node.width,
        height: node.height,
        pointerEvents: 'auto'
      }}
      onClick={() => onClick(node.id)}
      onMouseEnter={() => onHover(node.id)}
      onMouseLeave={() => onHover(null)}
    >
      {/* Node label */}
      <div className="text-sm font-semibold text-gray-200 text-center select-none line-clamp-2">
        {node.label}
      </div>

      {/* Node ID (for debugging) */}
      <div className="text-[10px] text-gray-600 font-mono mt-1">
        {node.id.slice(0, 8)}...
      </div>

      {/* Status indicator dot */}
      <div
        className={`absolute top-2 right-2 w-2 h-2 rounded-full
          ${status === 'verified' ? 'bg-green-500' : ''}
          ${status === 'broken' ? 'bg-red-500' : ''}
          ${status === 'pending' ? 'bg-yellow-500' : ''}
          ${status === 'approved' ? 'bg-blue-500' : ''}
        `}
      />
    </div>
  )
}

// ============================================================================
// MARK: Edge Component
// ============================================================================

interface GraphEdgeProps {
  edge: SpecEdge
}

function GraphEdge({ edge }: GraphEdgeProps) {
  if (!edge.points || edge.points.length < 2) {
    return null
  }

  // Build SVG path from points
  const points = edge.points
  let pathD = `M ${points[0].x} ${points[0].y}`

  if (points.length === 3) {
    // Quadratic Bezier curve
    pathD += ` Q ${points[1].x} ${points[1].y} ${points[2].x} ${points[2].y}`
  } else {
    // Polyline
    for (let i = 1; i < points.length; i++) {
      pathD += ` L ${points[i].x} ${points[i].y}`
    }
  }

  return (
    <g>
      {/* Visible edge */}
      <path
        d={pathD}
        fill="none"
        stroke="#06b6d4"
        strokeWidth="2"
        className="opacity-50"
      />

      {/* Invisible wider stroke for easier hovering */}
      <path
        d={pathD}
        fill="none"
        stroke="transparent"
        strokeWidth="10"
      />

      {/* Edge label (if present) */}
      {edge.label && points.length > 0 && (
        <foreignObject
          x={points[Math.floor(points.length / 2)].x - 50}
          y={points[Math.floor(points.length / 2)].y - 15}
          width="100"
          height="30"
        >
          <div className="text-[10px] text-cyan-300 bg-gray-900/80 px-1 py-0.5 rounded text-center border border-cyan-900/50 backdrop-blur-sm shadow-sm">
            {edge.label}
          </div>
        </foreignObject>
      )}
    </g>
  )
}

// ============================================================================
// MARK: Main GraphCanvas Component
// ============================================================================

export const GraphCanvas = forwardRef<GraphCanvasRef, GraphCanvasProps>(
  ({ nodes, edges }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null)
  // @ts-ignore - panzoom module type definition issue
  const pzRef = useRef<any>(null)
  const [isPanzoomReady, setIsPanzoomReady] = useState(false)

  // Store selectors - subscribe to internal state directly
  const _selectedNodeIds = useGraphStore((state) => state._selectedNodeIds)
  const hoveredNodeId = useGraphStore((state) => state._hoveredNodeId)
  const selectNodes = useGraphStore((state) => state.selectNodes)
  const setHoveredNode = useGraphStore((state) => state.setHoveredNode)
  const setLayoutNodes = useGraphStore((state) => state.setLayoutNodes)

  // Create Set from array for O(1) lookups (memoized to avoid reference changes)
  const selectedNodeIds = useMemo(() => new Set(_selectedNodeIds), [_selectedNodeIds])

  // Update store with calculated layout nodes
  useEffect(() => {
    setLayoutNodes(nodes)
  }, [nodes, setLayoutNodes])

  // Initialize Panzoom
  useEffect(() => {
    if (!containerRef.current) return

    try {
      // Safe import handling for panzoom
      // @ts-ignore - panzoom ESM interop
      const initPanzoom = panzoom.default || panzoom

      if (typeof initPanzoom !== 'function') {
        console.warn('[GraphCanvas] panzoom function not found')
        return
      }

      // @ts-ignore
      pzRef.current = initPanzoom(containerRef.current, {
        maxScale: 2,
        minScale: 0.1,
        zoomDoubleClickSpeed: 1,
        filterKey: () => true // Prevent keyboard shortcuts
      })

      setIsPanzoomReady(true)

      // Center the view initially
      setTimeout(() => {
        if (containerRef.current && pzRef.current) {
          try {
            const rect = containerRef.current.getBoundingClientRect()
            const cx = rect.width || 800
            const cy = rect.height || 600

            // Center the view
            pzRef.current.moveTo(cx / 2 - 300, cy / 2 - 150)
            pzRef.current.zoomAbs(0, 0, 0.9)
          } catch (e) {
            console.warn('[GraphCanvas] Initial zoom failed:', e)
          }
        }
      }, 100)
    } catch (err) {
      console.error('[GraphCanvas] Failed to initialize panzoom:', err)
    }

    return () => {
      if (pzRef.current && typeof pzRef.current.dispose === 'function') {
        pzRef.current.dispose()
      }
    }
  }, [])

  // Handle node click
  const handleNodeClick = (nodeId: string) => {
    selectNodes(nodeId)
  }

  // Handle node hover
  const handleNodeHover = (nodeId: string | null) => {
    setHoveredNode(nodeId)
  }

  // Expose methods via ref (for App.tsx to call)
  useImperativeHandle(
    ref,
    () => ({
      centerOnNode: (nodeId: string) => {
        const node = nodes.find((n) => n.id === nodeId)
        if (!node || !pzRef.current) return

        // Calculate pan position to center the node
        // node.x/y is center, we need to account for viewport size
        const container = containerRef.current
        if (!container) return

        const rect = container.getBoundingClientRect()
        const viewportCenterX = rect.width / 2
        const viewportCenterY = rect.height / 2

        // Calculate move to center the node
        // Current transform needs to be inverted to get world position
        const transform = pzRef.current.getTransform()
        const targetX = viewportCenterX - node.x
        const targetY = viewportCenterY - node.y

        pzRef.current.moveTo(transform.x + targetX, transform.y + targetY)
      }
    }),
    [nodes]
  )

  // ============================================================================
  // MARK: Render
  // ============================================================================

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
            // Calculate canvas size based on node positions
            // Add padding around the outermost nodes
            width: '5000px',
            height: '5000px'
          }}
        >
          {/* SVG Layer for Edges (rendered behind nodes) */}
          <svg
            className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-visible"
            style={{ zIndex: 0 }}
          >
            <defs>
              {/* Arrow marker for directed edges */}
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon points="0 0, 10 3.5, 0 7" fill="#06b6d4" />
              </marker>
            </defs>

            {edges.map((edge, index) => (
              <GraphEdge key={`edge-${edge.from}-${edge.to}-${index}`} edge={edge} />
            ))}
          </svg>

          {/* HTML Layer for Nodes */}
          {nodes.map((node) => (
            <NodeCard
              key={node.id}
              node={node}
              isSelected={selectedNodeIds.has(node.id)}
              isHovered={hoveredNodeId === node.id}
              onClick={handleNodeClick}
              onHover={handleNodeHover}
            />
          ))}
        </div>
      </div>

      {/* Controls overlay */}
      <div className="absolute bottom-4 right-4 bg-gray-900/80 backdrop-blur border border-gray-700 p-2 rounded text-[10px] text-gray-400 font-mono pointer-events-none select-none">
        Pan: Drag • Zoom: Scroll • Click: Select
      </div>

      {/* Loading indicator */}
      {!isPanzoomReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-950/50">
          <div className="text-gray-400 font-mono text-sm">Initializing graph...</div>
        </div>
      )}
    </div>
  )
})

GraphCanvas.displayName = 'GraphCanvas'
