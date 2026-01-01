import React from 'react';

interface InteractiveWrapperProps {
  nodeId: string;
  activeNodeId: string | null;
  onSelect: (id: string) => void;
  children: React.ReactNode;
  label?: string;
  className?: string;
}

const InteractiveWrapper: React.FC<InteractiveWrapperProps> = ({ 
  nodeId, 
  activeNodeId, 
  onSelect, 
  children,
  label = "Linked Node",
  className = ""
}) => {
  const isActive = nodeId === activeNodeId;

  return (
    <div 
      className={`relative transition-all duration-200 ${isActive ? 'z-10' : 'z-0'} ${className}`}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(nodeId);
      }}
      data-node-id={nodeId}
    >
      {isActive && (
        <>
          <div className="absolute -inset-1 border-2 border-dashed border-red-500 rounded-lg pointer-events-none animate-pulse" />
          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 -translate-y-full bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm whitespace-nowrap z-20 pointer-events-none">
            {label}
            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1 w-2 h-2 bg-red-600 rotate-45"></div>
          </div>
        </>
      )}
      {children}
    </div>
  );
};

export default InteractiveWrapper;