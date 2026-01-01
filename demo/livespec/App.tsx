import React, { useState, useEffect, useMemo, Component, ErrorInfo, ReactNode } from 'react';
import Header from './components/Header';
import GuestViewport from './components/GuestViewport';
import SpecTree from './components/SpecTree';
import DetailPane from './components/DetailPane';
import GraphView from './components/GraphView';
import { INITIAL_DATA } from './constants';
import { SpecData, ViewMode, NestedTreeNode } from './types';
import { getNestedTree } from './services/treeService';
import { calculateLayout } from './services/layoutService';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// Error Boundary Component
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("React Error Boundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-full flex items-center justify-center bg-gray-900 text-red-500 p-10 flex-col">
          <h2 className="text-2xl font-bold mb-4">Something went wrong.</h2>
          <pre className="bg-gray-800 p-4 rounded text-sm font-mono overflow-auto max-w-full">
            {this.state.error?.toString()}
          </pre>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-6 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const AppContent: React.FC = () => {
  const [data, setData] = useState<SpecData>(INITIAL_DATA);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);

  // Initialize Layout on mount
  useEffect(() => {
    try {
      // Small delay to ensure dagre is loaded if it's struggling
      const timer = setTimeout(() => {
        try {
          const { nodes, edges } = calculateLayout(INITIAL_DATA.nodes, INITIAL_DATA.edges);
          setData(prev => ({
            ...prev,
            nodes, 
            edges,
            layoutNodes: nodes
          }));
        } catch (innerE) {
          console.error("Inner layout calc failed", innerE);
          // Don't crash, just stick to initial data
        }
      }, 50);
      return () => clearTimeout(timer);
    } catch (e) {
      console.error("Layout calculation failed:", e);
      // Fallback: just use initial data without coordinates if layout fails
      setData(INITIAL_DATA);
    }
  }, []);

  const handleToggleView = (mode: ViewMode) => {
    setData(prev => ({ ...prev, viewMode: mode }));
  };

  const handleInteraction = (id: string) => {
    setActiveNodeId(id);
  };

  // Transform flat nodes to tree structure for the Tree View
  const treeNodes = useMemo(() => getNestedTree(data.nodes), [data.nodes]);

  // Find active node for DetailPane
  const activeNode = useMemo(() => {
     if (!activeNodeId) return null;
     return data.nodes.find(n => n.id === activeNodeId) as NestedTreeNode | null;
  }, [activeNodeId, data.nodes]);

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-gray-100 overflow-hidden font-sans">
      <Header 
        appName={data.meta.name} 
        version={data.meta.version}
        viewMode={data.viewMode} 
        onToggleView={handleToggleView} 
      />
      
      <main className="flex-1 flex overflow-hidden">
        {/* Left Panel: Guest Viewport (60%) */}
        <div className="w-[60%] h-full relative z-0 border-r border-gray-800">
          <GuestViewport 
            activeNodeId={activeNodeId} 
            onSelectNode={handleInteraction} 
          />
        </div>

        {/* Right Panel: LiveSpec Controller (40%) */}
        <div className="w-[40%] h-full flex flex-col bg-gray-950 z-10 shadow-2xl relative border-l border-gray-800">
          
          <div className="flex-1 overflow-hidden flex flex-col">
            {data.viewMode === 'tree' ? (
               <div className="flex-1 overflow-y-auto dark-scrollbar p-4">
                  <div className="mb-4 flex items-center justify-between">
                     <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Specification Tree</h2>
                     <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">{data.nodes.length} nodes</span>
                  </div>
                  <SpecTree 
                     nodes={treeNodes} 
                     activeNodeId={activeNodeId} 
                     onSelect={handleInteraction} 
                  />
               </div>
            ) : (
               <GraphView 
                  nodes={data.nodes} 
                  edges={data.edges}
                  activeNodeId={activeNodeId}
                  onHoverNode={handleInteraction}
               />
            )}
          </div>

          {/* Fixed Detail Pane at Bottom */}
          <DetailPane node={activeNode} />
        </div>
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
};

export default App;