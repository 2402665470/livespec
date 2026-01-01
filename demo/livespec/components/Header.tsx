import React from 'react';
import { ViewMode } from '../types';
import { TreeStructure, Graph } from 'phosphor-react';

interface HeaderProps {
  appName: string;
  version: string;
  viewMode: ViewMode;
  onToggleView: (mode: ViewMode) => void;
}

const Header: React.FC<HeaderProps> = ({ appName, version, viewMode, onToggleView }) => {
  return (
    <header className="h-16 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-6 shrink-0 z-20 relative">
      <div className="flex items-center space-x-4">
        <div className="flex flex-col">
          <h1 className="font-semibold text-lg text-gray-100 tracking-tight leading-none">{appName}</h1>
          <span className="text-xs text-gray-500 font-mono mt-1">v{version}</span>
        </div>
      </div>

      <div className="flex bg-gray-950 p-1 rounded-lg border border-gray-800">
        <button 
          onClick={() => onToggleView('tree')}
          className={`
            flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all
            ${viewMode === 'tree' 
              ? 'bg-gray-800 text-white shadow-sm ring-1 ring-white/10' 
              : 'text-gray-400 hover:text-gray-200'}
          `}
        >
          <TreeStructure size={16} />
          <span>Tree View</span>
        </button>
        <button 
          onClick={() => onToggleView('graph')}
          className={`
            flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all
            ${viewMode === 'graph' 
              ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/20' 
              : 'text-gray-400 hover:text-gray-200'}
          `}
        >
          <Graph size={16} />
          <span>Graph View</span>
        </button>
      </div>
    </header>
  );
};

export default Header;