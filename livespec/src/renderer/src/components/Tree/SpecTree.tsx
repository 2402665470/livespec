/**
 * SpecTree Component
 *
 * Displays the spec graph as a hierarchical tree
 * Features:
 * - Recursive tree structure
 * - Expand/collapse groups
 * - Click to select
 * - Icon indicators (Phosphor - matching prototype)
 */

import { useMemo } from 'react'
import { CaretRight, CaretDown, Folder, File } from 'phosphor-react'
import type { SpecNode } from '../../../../shared/types'
import { useGraphStore } from '../../stores/graph-store'
import { buildTree, type TreeNode } from '../../hooks/useAutoLayout'

// ============================================================================
// MARK: TreeItem Component (Recursive)
// ============================================================================

interface TreeItemProps {
  node: TreeNode
  level: number
  selectedNodeId: string | null
  onNodeClick: (nodeId: string) => void
}

function TreeItem({ node, level, selectedNodeId, onNodeClick }: TreeItemProps) {
  const isGroup = node.category === 'group'
  const hasChildren = node.children.length > 0
  const isSelected = selectedNodeId === node.id

  // Toggle expanded state
  const toggleExpanded = () => {
    node.expanded = !node.expanded
    // Force re-render by updating store (simplified for V1)
    onNodeClick(node.id) // Just trigger a state update
  }

  // Handle node click
  const handleClick = () => {
    onNodeClick(node.id)
  }

  return (
    <div>
      {/* Node row */}
      <div
        className={`flex items-center gap-2 py-1.5 px-2 rounded cursor-pointer transition-colors
          ${isSelected ? 'bg-indigo-600/20 text-indigo-300' : 'hover:bg-gray-800 text-gray-400'}
        `}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={handleClick}
      >
        {/* Expand/Collapse toggle */}
        {(isGroup || hasChildren) && (
          <button
            className="p-0.5 hover:bg-gray-700 rounded transition-colors"
            onClick={(e) => {
              e.stopPropagation()
              toggleExpanded()
            }}
          >
            {node.expanded ? (
              <CaretDown size={16} weight="regular" />
            ) : (
              <CaretRight size={16} weight="regular" />
            )}
          </button>
        )}

        {/* Type icon */}
        {isGroup ? (
          <Folder size={18} weight={isSelected ? "fill" : "regular"} className={isSelected ? 'text-indigo-400' : 'text-gray-500'} />
        ) : (
          <File size={18} weight="regular" className={isSelected ? 'text-indigo-400' : 'text-gray-500'} />
        )}

        {/* Node label */}
        <span className="text-sm font-medium truncate flex-1">{node.label}</span>

        {/* Status indicator */}
        <div
          className={`w-2 h-2 rounded-full flex-shrink-0
            ${node.status === 'verified' ? 'bg-green-500' : ''}
            ${node.status === 'broken' ? 'bg-red-500' : ''}
            ${node.status === 'pending' ? 'bg-yellow-500' : ''}
            ${node.status === 'approved' ? 'bg-blue-500' : ''}
          `}
        />

        {/* Child count for groups */}
        {isGroup && (
          <span className="text-xs text-gray-600 font-mono">
            {node.children.length}
          </span>
        )}
      </div>

      {/* Recursive children */}
      {isGroup && node.expanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <TreeItem
              key={child.id}
              node={child}
              level={level + 1}
              selectedNodeId={selectedNodeId}
              onNodeClick={onNodeClick}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// MARK: Main SpecTree Component
// =============================================================================

interface SpecTreeProps {
  nodes: SpecNode[]
  onNodeClick?: (nodeId: string) => void
}

export function SpecTree({ nodes, onNodeClick }: SpecTreeProps) {
  const selectedNodeId = useGraphStore((state) => state.hoveredNodeId) || null
  const selectNodes = useGraphStore((state) => state.selectNodes)

  // Build tree structure from flat nodes
  const tree = useMemo(() => {
    return buildTree(nodes)
  }, [nodes])

  const handleNodeClick = (nodeId: string) => {
    selectNodes(nodeId)

    // Call external callback if provided (for Host→Guest communication)
    if (onNodeClick) {
      onNodeClick(nodeId)
    }
  }

  if (nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8">
        <File size={48} weight="thin" className="mb-4 opacity-50" />
        <p className="text-sm">No nodes to display</p>
        <p className="text-xs mt-1">Create a spec_graph.json to get started</p>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto">
      {tree.map((node) => (
        <TreeItem
          key={node.id}
          node={node}
          level={0}
          selectedNodeId={selectedNodeId}
          onNodeClick={handleNodeClick}
        />
      ))}
    </div>
  )
}
