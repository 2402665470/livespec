import React, { useState } from 'react';
import { TreeNode } from '../types';
import { 
  Folder, 
  CheckCircle, 
  Circle, 
  WarningCircle, 
  CaretRight, 
  CaretDown 
} from 'phosphor-react';

interface SpecTreeProps {
  nodes: TreeNode[];
  activeNodeId: string | null;
  onSelect: (id: string) => void;
  level?: number;
}

const StatusIcon = ({ status, type }: { status: string, type: string }) => {
  if (type === 'feature') return <Folder size={18} weight="fill" className="text-blue-400" />;
  
  switch (status) {
    case 'verified': return <CheckCircle size={18} weight="fill" className="text-green-500" />;
    case 'pending': return <Circle size={18} weight="bold" className="text-yellow-500" />;
    case 'broken': return <WarningCircle size={18} weight="fill" className="text-red-500" />;
    default: return <Circle size={18} className="text-gray-500" />;
  }
};

const TreeNodeItem: React.FC<{
  node: TreeNode;
  activeNodeId: string | null;
  onSelect: (id: string) => void;
  level: number;
}> = ({ node, activeNodeId, onSelect, level }) => {
  const [isExpanded, setIsExpanded] = useState(node.expanded ?? false);
  const isActive = activeNodeId === node.id;
  const hasChildren = node.children && node.children.length > 0;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const handleClick = () => {
    onSelect(node.id);
  };

  return (
    <div className="select-none">
      <div 
        className={`
          flex items-center py-1.5 px-3 cursor-pointer transition-colors border-l-2
          ${isActive 
            ? 'bg-blue-900/30 border-blue-500 text-white' 
            : 'hover:bg-gray-800 border-transparent text-gray-300'}
        `}
        style={{ paddingLeft: `${level * 20 + 12}px` }}
        onClick={handleClick}
      >
        <div 
          className={`mr-2 p-0.5 rounded hover:bg-white/10 ${hasChildren ? 'visible' : 'invisible'}`}
          onClick={handleToggle}
        >
          {isExpanded ? <CaretDown size={12} /> : <CaretRight size={12} />}
        </div>
        
        <div className="mr-2.5 flex-shrink-0">
          <StatusIcon status={node.status} type={node.type} />
        </div>
        
        <span className={`text-sm truncate ${isActive ? 'font-medium' : 'font-normal'}`}>
          {node.label}
        </span>
        
        {/* Status Label (Optional, for extra clarity) */}
        {node.type === 'task' && (
           <span className={`ml-auto text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-opacity-20 ${
              node.status === 'verified' ? 'bg-green-500 text-green-400' :
              node.status === 'broken' ? 'bg-red-500 text-red-400' :
              'bg-yellow-500 text-yellow-400'
           }`}>
              {node.status}
           </span>
        )}
      </div>

      {hasChildren && isExpanded && (
        <SpecTree 
          nodes={node.children!} 
          activeNodeId={activeNodeId} 
          onSelect={onSelect} 
          level={level + 1} 
        />
      )}
    </div>
  );
};

const SpecTree: React.FC<SpecTreeProps> = ({ nodes, activeNodeId, onSelect, level = 0 }) => {
  return (
    <div className="flex flex-col">
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

export default SpecTree;