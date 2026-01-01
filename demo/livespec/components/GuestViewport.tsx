import React from 'react';
import { CloudArrowUp, Trash, FileZip, Check, Warning } from 'phosphor-react';
import InteractiveWrapper from './InteractiveWrapper';

interface GuestViewportProps {
  activeNodeId: string | null;
  onSelectNode: (id: string) => void;
}

const GuestViewport: React.FC<GuestViewportProps> = ({ activeNodeId, onSelectNode }) => {
  return (
    <div className="h-full w-full bg-gray-100 flex items-center justify-center p-8 overflow-hidden">
      
      {/* Fake Application Window */}
      <div className="w-full max-w-3xl bg-white rounded-lg shadow-2xl border border-gray-300 overflow-hidden flex flex-col h-[600px]">
        
        {/* Title Bar */}
        <div className="h-10 bg-gray-200 border-b border-gray-300 flex items-center px-4 space-x-2">
           <div className="w-3 h-3 rounded-full bg-red-400"></div>
           <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
           <div className="w-3 h-3 rounded-full bg-green-400"></div>
           <span className="ml-4 text-xs font-semibold text-gray-500">BigFish Desktop v0.2.0</span>
        </div>

        {/* Mock Content */}
        <div className="flex-1 p-10 flex flex-col gap-8 bg-white">
          
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-gray-800">Plugin Importer</h1>
            <p className="text-gray-500">Manage your installed extensions.</p>
          </div>

          {/* Import Section */}
          <div className="border rounded-lg p-6 bg-gray-50">
             <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-700">New Plugin</h3>
                <InteractiveWrapper 
                    nodeId="task_validate" 
                    activeNodeId={activeNodeId} 
                    onSelect={onSelectNode}
                    label="Logic: Validate Zip"
                >
                  <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded border border-yellow-200 flex items-center gap-1">
                     <Warning /> Validation Ready
                  </span>
                </InteractiveWrapper>
             </div>

             <InteractiveWrapper 
                nodeId="task_select" 
                activeNodeId={activeNodeId} 
                onSelect={onSelectNode}
                label="Action: Select File"
             >
                <button className="w-full h-32 border-2 border-dashed border-indigo-300 bg-indigo-50 rounded-lg flex flex-col items-center justify-center text-indigo-600 hover:bg-indigo-100 transition-colors">
                   <CloudArrowUp size={32} weight="bold" />
                   <span className="mt-2 font-medium">Select .zip File</span>
                </button>
             </InteractiveWrapper>
          </div>

          {/* List Section */}
          <div className="flex-1">
             <h3 className="font-semibold text-gray-700 mb-4">Installed (1)</h3>
             
             <div className="border rounded-lg p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                   <div className="p-2 bg-blue-100 text-blue-600 rounded">
                      <FileZip size={24} />
                   </div>
                   <div>
                      <div className="font-medium text-gray-900">Legacy Connector</div>
                      <div className="text-xs text-gray-500">v1.0.4 • Installed yesterday</div>
                   </div>
                </div>

                <InteractiveWrapper 
                   nodeId="task_remove" 
                   activeNodeId={activeNodeId} 
                   onSelect={onSelectNode}
                   label="Action: Uninstall"
                >
                   <button className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-2 rounded transition-colors">
                      <Trash size={20} />
                   </button>
                </InteractiveWrapper>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default GuestViewport;