/**
 * useGraphOperations Hook
 *
 * Provides high-level graph manipulation methods
 */

import { useCallback } from 'react'
import { useGraphStore } from '../stores/graph-store'
import type {
  SpecNode,
  SpecEdge,
  SpecNodeCategory,
  SpecNodeStatus
} from '../../../shared/types'

export function useGraphOperations() {
  const { selectNodes, clearSelection, currentGraph } = useGraphStore()

  const createSpecNode = useCallback(
    (
      label: string,
      category: SpecNodeCategory,
      status: SpecNodeStatus = 'pending' as SpecNodeStatus,
      parentId: string | null = null
    ): SpecNode => {
      return {
        id: `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        label,
        category,
        status,
        parentId
      }
    },
    []
  )

  const createEdgeBetween = useCallback(
    (from: string, to: string): SpecEdge | null => {
      if (!currentGraph) return null

      // Check if edge already exists
      const exists = currentGraph.edges.some(
        (e) => e.from === from && e.to === to
      )

      if (exists) {
        console.warn('Edge already exists between these nodes')
        return null
      }

      const newEdge: SpecEdge = {
        from,
        to
      }

      return newEdge
    },
    [currentGraph]
  )

  const deleteSelectedNodes = useCallback(() => {
    const { selectedNodeIds } = useGraphStore.getState()
    // Note: Actual deletion needs to be implemented in the store
    console.log('Would delete nodes:', Array.from(selectedNodeIds))
    clearSelection()
  }, [clearSelection])

  return {
    createSpecNode,
    createEdgeBetween,
    deleteSelectedNodes,
    selectNodes,
    clearSelection
  }
}
