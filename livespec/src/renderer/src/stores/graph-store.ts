/**
 * Graph Store
 *
 * Manages the current spec graph state and layout
 */

import { create } from 'zustand'
import { useMemo } from 'react'
import { immer } from 'zustand/middleware/immer'
import type {
  SpecGraphData,
  LayoutNode,
  GraphStoreState
} from '../../../shared/types'

interface GraphState extends GraphStoreState {
  // Internal state
  _currentGraph: SpecGraphData | null
  _layoutNodes: LayoutNode[]
  _selectedNodeIds: string[]
  _hoveredNodeId: string | null
  _isLoading: boolean
  _error: string | null
}

export const useGraphStore = create<GraphState>()(
  immer((set, get) => ({
    // Initial state
    _currentGraph: null,
    _layoutNodes: [],
    _selectedNodeIds: [],
    _hoveredNodeId: null,
    _isLoading: false,
    _error: null,

    // Getters (for compatibility with interface)
    get currentGraph() {
      return get()._currentGraph
    },
    get layoutNodes() {
      return get()._layoutNodes
    },
    get selectedNodeIds() {
      return new Set(get()._selectedNodeIds)
    },
    get hoveredNodeId() {
      return get()._hoveredNodeId
    },
    get isLoading() {
      return get()._isLoading
    },
    get error() {
      return get()._error
    },

    // Actions
    setCurrentGraph: (graph: SpecGraphData) =>
      set((state) => {
        state._currentGraph = graph
        state._selectedNodeIds = []
        state._layoutNodes = [] // Will be calculated by the layout hook
      }),

    setLayoutNodes: (nodes: LayoutNode[]) =>
      set((state) => {
        state._layoutNodes = nodes
      }),

    selectNodes: (nodeIds: string[] | string) =>
      set((state) => {
        state._selectedNodeIds = Array.isArray(nodeIds) ? nodeIds : [nodeIds]
      }),

    clearSelection: () =>
      set((state) => {
        state._selectedNodeIds = []
      }),

    setHoveredNode: (nodeId: string | null) =>
      set((state) => {
        state._hoveredNodeId = nodeId
      }),

    setLoading: (isLoading: boolean) =>
      set((state) => {
        state._isLoading = isLoading
      }),

    setError: (error: string | null) =>
      set((state) => {
        state._error = error
      })
  }))
)

// ============================================================================
// MARK: Selector Helpers (cached selectors)
// ============================================================================

/**
 * Get selected node IDs as a Set (cached)
 * Use this in components to avoid re-renders
 */
export const useSelectedNodeIdsSet = () => {
  const selectedNodeIds = useGraphStore((state) => state._selectedNodeIds)
  // Memoize the Set to avoid reference changes
  return useMemo(() => new Set(selectedNodeIds), [selectedNodeIds])
}

/**
 * Get a layout node by ID
 */
export const selectLayoutNodeById = (state: GraphState, nodeId: string) =>
  state._layoutNodes.find((n) => n.id === nodeId)

/**
 * Get all edges connected to a node
 */
export const selectEdgesByNodeId = (state: GraphState, nodeId: string) => {
  if (!state._currentGraph) return []
  return state._currentGraph.edges.filter(
    (e) => e.from === nodeId || e.to === nodeId
  )
}

/**
 * Get all connected nodes
 */
export const selectConnectedNodes = (state: GraphState, nodeId: string) => {
  const edges = selectEdgesByNodeId(state, nodeId)
  const connectedIds = new Set<string>()

  edges.forEach((e) => {
    connectedIds.add(e.from)
    connectedIds.add(e.to)
  })

  connectedIds.delete(nodeId)

  return state._layoutNodes.filter((n) => connectedIds.has(n.id))
}

/**
 * Get child nodes of a group node
 */
export const selectChildNodes = (state: GraphState, parentId: string) => {
  return state._layoutNodes.filter((n) => n.parentId === parentId)
}

/**
 * Get all group nodes
 */
export const selectGroupNodes = (state: GraphState) => {
  return state._layoutNodes.filter((n) => n.category === 'group')
}
