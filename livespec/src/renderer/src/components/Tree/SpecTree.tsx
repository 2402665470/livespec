/**
 * SpecTree Component (Refactored to match Demo Prototype)
 *
 * Displays the spec graph as a hierarchical tree, matching the visual fidelity
 * and interaction design of the `demo/livespec` prototype.
 */
import { useState, useMemo } from 'react';
import { 
  CaretRight, 
  CaretDown, 
  Folder, 
  File,
  CheckCircle,
  WarningCircle,
  Circle
} from 'phosphor-react';
import type { SpecNode } from '../../../../shared/types';
import { useGraphStore } from '../../stores/graph-store';
import { buildTree, type TreeNode } from '../../hooks/useAutoLayout';
import { clsx } from 'clsx';

// ===========================================================================
// MARK: StatusIcon Component (from Demo)
// ===========================================================================

const StatusIcon = ({ status, category }: { status: string; category: string }) => {
  if (category === 'group') {
    return <Folder size={18} weight="fill" className="text-blue-400" />;
  }

  switch (status) {
    case 'verified':
      return <CheckCircle size={18} weight="fill" className="text-green-500" />;
    case 'pending':
      return <Circle size={18} weight="bold" className="text-yellow-500" />;
    case 'broken':
      return <WarningCircle size={18} weight="fill" className="text-red-500" />;
    default:
      return <Circle size={18} className="text-gray-500" />;
  }
};


// ===========================================================================
// MARK: TreeItem Component (Refactored)
// ===========================================================================

interface TreeItemProps {
  node: TreeNode;
  level: number;
  selectedNodeIds: Set<string>;
  onNodeClick: (nodeId: string) => void;
}

function TreeItem({ node, level, selectedNodeIds, onNodeClick }: TreeItemProps) {
  // Use local state for expansion, defaulting to true for root-level groups
  const [isExpanded, setIsExpanded] = useState(node.expanded ?? level === 0);
  const isSelected = selectedNodeIds.has(node.id);
  const hasChildren = node.children && node.children.length > 0;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const handleClick = () => {
    onNodeClick(node.id);
  };

  return (
    <div className="select-none">
      {/* Node Row - Styles from Demo */}
      <div
        className={clsx(
          'flex items-center py-1.5 px-3 cursor-pointer transition-colors border-l-2',
          {
            'bg-blue-900/30 border-blue-500 text-white': isSelected,
            'hover:bg-gray-800 border-transparent text-gray-300': !isSelected,
          }
        )}
        style={{ paddingLeft: `${level * 20 + 12}px` }}
        onClick={handleClick}
      >
        {/* Expansion Caret */}
        <div
          className={clsx('mr-2 p-0.5 rounded hover:bg-white/10', {
            'invisible': !hasChildren, // Reserve space even if no children
          })}
          onClick={handleToggle}
        >
          {isExpanded ? <CaretDown size={12} /> : <CaretRight size={12} />}
        </div>

        {/* Status Icon */}
        <div className="mr-2.5 flex-shrink-0">
          <StatusIcon status={node.status} category={node.category} />
        </div>

        {/* Node Label */}
        <span className={clsx('text-sm truncate', { 'font-medium': isSelected, 'font-normal': !isSelected })}>
          {node.label}
        </span>
      </div>

      {/* Recursive Children */}
      {hasChildren && isExpanded && (
        <div>
          {node.children.map((child) => (
            <TreeItem
              key={child.id}
              node={child}
              level={level + 1}
              selectedNodeIds={selectedNodeIds}
              onNodeClick={onNodeClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}


// ===========================================================================
// MARK: Main SpecTree Component (Updated)
// ===========================================================================

interface SpecTreeProps {
  nodes: SpecNode[];
  onNodeClick?: (nodeId: string) => void;
}

export function SpecTree({ nodes, onNodeClick }: SpecTreeProps) {
  const selectedNodeIds = useGraphStore((state) => state.selectedNodeIds);
  const selectNodes = useGraphStore((state) => state.selectNodes);

  const tree = useMemo(() => {
    // The buildTree function from useAutoLayout should be used here.
    // Ensure it correctly transforms flat nodes to a nested structure.
    return buildTree(nodes);
  }, [nodes]);

  const handleNodeClick = (nodeId: string) => {
    selectNodes(nodeId);
    if (onNodeClick) {
      onNodeClick(nodeId);
    }
  };

  if (nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8">
        <File size={48} weight="thin" className="mb-4 opacity-50" />
        <p className="text-sm">No spec loaded</p>
        <p className="text-xs mt-1">Open a project to see the spec tree</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      {tree.map((node) => (
        <TreeItem
          key={node.id}
          node={node}
          level={0}
          selectedNodeIds={selectedNodeIds}
          onNodeClick={handleNodeClick}
        />
      ))}
    </div>
  );
}