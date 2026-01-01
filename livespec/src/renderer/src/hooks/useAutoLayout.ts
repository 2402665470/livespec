/**
 * useAutoLayout Hook
 *
 * Uses Dagre to calculate automatic graph layout
 * Converts flat SpecNode[] -> LayoutNode[] with x,y coordinates
 */

import { useMemo } from 'react'
import dagre from 'dagre'
import type {
  SpecNode,
  SpecEdge,
  LayoutNode,
  SpecNodeCategory
} from '../../../shared/types'

// ============================================================================
// MARK: Layout Constants
// ============================================================================

const LAYOUT_CONFIG = {
  NODE_WIDTH: 180,
  NODE_HEIGHT: 80,
  GROUP_WIDTH: 350,
  GROUP_HEIGHT: 250,
  RANKSEP: 80,    // Vertical spacing between ranks
  NODESEP: 50,    // Horizontal spacing between nodes
  MARGINX: 50,
  MARGINY: 50
}

// ============================================================================
// MARK: Helper Functions
// ============================================================================

function estimateNodeSize(category: SpecNodeCategory) {
  return category === 'group'
    ? { width: LAYOUT_CONFIG.GROUP_WIDTH, height: LAYOUT_CONFIG.GROUP_HEIGHT }
    : { width: LAYOUT_CONFIG.NODE_WIDTH, height: LAYOUT_CONFIG.NODE_HEIGHT }
}

// ============================================================================
// MARK: Main Hook
// ============================================================================

interface UseAutoLayoutOptions {
  nodes: SpecNode[]
  edges: SpecEdge[]
  enabled?: boolean
}

interface UseAutoLayoutResult {
  layoutNodes: LayoutNode[]
  layoutEdges: SpecEdge[]
}

export function useAutoLayout({
  nodes,
  edges,
  enabled = true
}: UseAutoLayoutOptions): UseAutoLayoutResult {
  const { layoutNodes, layoutEdges } = useMemo(() => {
    if (!enabled || nodes.length === 0) {
      return { layoutNodes: [], layoutEdges: [] }
    }

    try {
      // Create dagre graph
      const g = new dagre.graphlib.Graph()

      // Set graph options
      g.setGraph({
        rankdir: 'LR',
        ranksep: LAYOUT_CONFIG.RANKSEP,
        nodesep: LAYOUT_CONFIG.NODESEP,
        marginx: LAYOUT_CONFIG.MARGINX,
        marginy: LAYOUT_CONFIG.MARGINY
      })

      g.setDefaultEdgeLabel(() => ({}))

      // Add nodes
      nodes.forEach((node) => {
        const size = estimateNodeSize(node.category)
        g.setNode(node.id, {
          width: size.width,
          height: size.height,
          label: node.label
        })
      })

      // FIX (Audit Log 02): Validate edges before adding to graph
      // Filter out edges with missing source/target nodes
      const validEdges: SpecEdge[] = []
      const nodeIds = new Set(nodes.map((n) => n.id))

      edges.forEach((edge) => {
        const hasSource = nodeIds.has(edge.from)
        const hasTarget = nodeIds.has(edge.to)

        if (!hasSource) {
          console.warn(`[useAutoLayout] Edge source not found: ${edge.from}`)
        }
        if (!hasTarget) {
          console.warn(`[useAutoLayout] Edge target not found: ${edge.to}`)
        }

        if (hasSource && hasTarget) {
          validEdges.push(edge)
          g.setEdge(edge.from, edge.to)
        }
      })

      if (edges.length !== validEdges.length) {
        console.warn(
          `[useAutoLayout] Filtered ${edges.length - validEdges.length} invalid edges`
        )
      }

      // Run layout
      dagre.layout(g)

      // Convert back to LayoutNode[]
      const calculatedNodes: LayoutNode[] = nodes.map((node) => {
        const dagreNode = g.node(node.id)

        if (!dagreNode) {
          console.warn(`[useAutoLayout] Node ${node.id} not found in Dagre output`)
          const size = estimateNodeSize(node.category)
          return {
            ...node,
            x: 0,
            y: 0,
            width: size.width,
            height: size.height
          }
        }

        return {
          ...node,
          x: dagreNode.x,
          y: dagreNode.y,
          width: dagreNode.width,
          height: dagreNode.height
        }
      })

      // Calculate edge points (use validated edges only)
      const calculatedEdges: SpecEdge[] = validEdges.map((edge) => {
        const dagreEdge = g.edge(edge.from, edge.to)
        return {
          ...edge,
          points: dagreEdge?.points || []
        }
      })

      console.log(`[useAutoLayout] Calculated layout for ${calculatedNodes.length} nodes`)

      return {
        layoutNodes: calculatedNodes,
        layoutEdges: calculatedEdges
      }
    } catch (error) {
      console.error('[useAutoLayout] Layout calculation failed:', error)
      return { layoutNodes: [], layoutEdges: [] }
    }
  }, [nodes, edges, enabled])

  return { layoutNodes, layoutEdges }
}

// ============================================================================
// MARK: Tree Builder Helper
// ============================================================================

export interface TreeNode extends LayoutNode {
  children: TreeNode[]
  expanded: boolean
}

export function buildTree(nodes: SpecNode[]): TreeNode[] {
  const nodeMap = new Map<string, TreeNode>()
  const rootNodes: TreeNode[] = []

  // First pass: create all tree nodes
  nodes.forEach((node) => {
    const size = estimateNodeSize(node.category)
    nodeMap.set(node.id, {
      ...node,
      x: 0,
      y: 0,
      width: size.width,
      height: size.height,
      children: [],
      expanded: node.category === 'group'
    })
  })

  // Second pass: build parent-child relationships
  nodes.forEach((node) => {
    const treeNode = nodeMap.get(node.id)!

    if (node.parentId) {
      const parent = nodeMap.get(node.parentId)
      if (parent) {
        parent.children.push(treeNode)
      } else {
        rootNodes.push(treeNode)
      }
    } else {
      rootNodes.push(treeNode)
    }
  })

  return rootNodes
}
