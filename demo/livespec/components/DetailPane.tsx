import React from 'react';
import { TreeNode } from '../types';
import { Info, Check } from 'phosphor-react';

interface DetailPaneProps {
  node: TreeNode | null;
}

const DetailPane: React.FC<DetailPaneProps> = ({ node }) => {
  if (!node) {
    return (
      <div className="h-64 bg-gray-850 border-t border-gray-700 p-6 flex flex-col items-center justify-center text-gray-500">
        <Info size={32} className="mb-2 opacity-50" />
        <p className="text-sm">Select a node to view details</p>
      </div>
    );
  }

  return (
    <div className="h-64 bg-gray-850 border-t border-gray-700 flex flex-col shadow-inner shrink-0">
      <div className="px-5 py-3 border-b border-gray-700 bg-gray-900/50 flex justify-between items-center">
        <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
          {node.type === 'feature' ? 'Feature Specification' : 'Task Criteria'}
        </h3>
        <span className="text-xs font-mono text-gray-500">{node.id}</span>
      </div>
      
      <div className="p-5 overflow-y-auto dark-scrollbar">
        <div className="mb-4">
          <h4 className="text-xs uppercase tracking-wider text-gray-500 font-bold mb-2">Description</h4>
          <p className="text-sm text-gray-300 leading-relaxed">
            {node.desc || "No description provided for this item."}
          </p>
        </div>

        {node.criteria && node.criteria.length > 0 && (
          <div>
            <h4 className="text-xs uppercase tracking-wider text-gray-500 font-bold mb-2">Acceptance Criteria</h4>
            <ul className="space-y-2">
              {node.criteria.map((criterion, index) => (
                <li key={index} className="flex items-start gap-2.5 text-sm text-gray-400 bg-gray-900/40 p-2 rounded border border-gray-700/50">
                  <Check size={14} className="mt-0.5 text-green-500 shrink-0" weight="bold" />
                  <span>{criterion}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default DetailPane;