import React, { useState } from 'react';
import { NestedTreeNode } from '../types';
import { 
  Folder, 
  File,
  CheckCircle, 
  Circle, 
  WarningCircle, 
  CaretRight, 
  CaretDown 
} from 'phosphor-react';

interface TreeViewProps {
  nodes: NestedTreeNode[];
  activeNodeId: string | null;
  onSelect: (id: string) => void;
  level?: number;
}

const StatusIndicator = ({ status }: { status: string }) => {
  switch (status) {
    case 'verified': return <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />;
    case 'pending': return <div className="w-2 h-2 rounded-full bg-yellow-500" />;
    case 'broken': return <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />;
    default: return <div className="w-2 h-2 rounded-full bg-gray-500" />;
  }
};

const TreeNodeItem: React.FC<{
  node: NestedTreeNode;
  activeNodeId: string | null;
  onSelect: (id: string) => void;
  level: number;
}> = ({ node, activeNodeId, onSelect, level }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const isActive = activeNodeId === node.id;
  const hasChildren = node.children && node.children.length > 0;
  const isFeature = node.type === 'feature';

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="select-none">
      <div 
        className={`
          flex items-center py-2 px-3 cursor-pointer transition-all border-l-[3px]
          ${isActive 
            ? 'bg-gray-800 border-indigo-500' 
            : 'border-transparent hover:bg-gray-800/50'}
        `}
        style={{ paddingLeft: `${level * 24 + 16}px` }}
        onMouseEnter={() => onSelect(node.id)}
      >
        <div 
          className={`mr-2 p-1 rounded hover:bg-white/10 text-gray-500 ${hasChildren ? 'visible' : 'invisible'}`}
          onClick={handleToggle}
        >
          {isExpanded ? <CaretDown size={12} weight="bold" /> : <CaretRight size={12} weight="bold" />}
        </div>
        
        <div className="mr-3 text-gray-400">
           {isFeature ? <Folder size={20} weight={isActive ? "fill" : "regular"} className="text-indigo-400" /> : <File size={18} />}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className={`text-sm truncate ${isActive ? 'text-white font-medium' : 'text-gray-400'}`}>
              {node.label}
            </span>
            <div className="ml-2 flex items-center">
               <StatusIndicator status={node.status} />
            </div>
          </div>
          {isActive && (
             <div className="text-[10px] text-gray-600 font-mono mt-0.5">{node.id}</div>
          )}
        </div>
      </div>

      {hasChildren && isExpanded && (
        <TreeView 
          nodes={node.children} 
          activeNodeId={activeNodeId} 
          onSelect={onSelect} 
          level={level + 1} 
        />
      )}
    </div>
  );
};

const TreeView: React.FC<TreeViewProps> = ({ nodes, activeNodeId, onSelect, level = 0 }) => {
  return (
    <div className="flex flex-col pb-4">
      {nodes.map(node => (
        <TreeNodeItem 
          key={node.id} 
          node={node} 
          activeNodeId={activeNodeId} 
          onSelect={onSelect} 
          level={level} 
        />
      ))}
    </div>
  );
};

export default TreeView;