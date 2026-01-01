import React, { useEffect, useRef, useState } from 'react';
import panzoom from 'panzoom';
import { SpecNode, SpecEdge } from '../types';

interface GraphViewProps {
  nodes: SpecNode[];
  edges: SpecEdge[];
  activeNodeId: string | null;
  onHoverNode: (id: string) => void;
}

const GraphView: React.FC<GraphViewProps> = ({ nodes, edges, activeNodeId, onHoverNode }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const pzRef = useRef<any>(null);
  const [isPanzoomReady, setIsPanzoomReady] = useState(false);

  useEffect(() => {
    if (containerRef.current) {
      try {
        // Safe import handling for various ESM environments
        // @ts-ignore
        const initPanzoom = panzoom && (panzoom.default || panzoom);
        
        if (typeof initPanzoom === 'function') {
          pzRef.current = initPanzoom(containerRef.current, {
            maxZoom: 2,
            minZoom: 0.1,
            zoomDoubleClickSpeed: 1,
            filterKey: function() { return true; }
          });
          setIsPanzoomReady(true);
          
          // Initial center
          setTimeout(() => {
             if (containerRef.current && pzRef.current) {
               try {
                 const rect = containerRef.current.getBoundingClientRect();
                 const cx = rect.width || 800;
                 const cy = rect.height || 600;
                 // Center the view roughly
                 pzRef.current.moveTo(cx/2 - 300, cy/2 - 150);
                 pzRef.current.zoomAbs(0, 0, 0.9);
               } catch(e) { console.warn("Initial zoom failed", e); }
             }
          }, 100);
        } else {
          console.warn('Panzoom function not found in export');
        }
      } catch (err) {
        console.error("Failed to initialize panzoom:", err);
      }

      return () => {
        if (pzRef.current && typeof pzRef.current.dispose === 'function') {
            pzRef.current.dispose();
        }
      };
    }
  }, []);

  const renderEdge = (edge: SpecEdge, i: number) => {
     if (!edge.points || edge.points.length < 2) return null;
     
     // Construct SVG Path from points
     const p = edge.points;
     let path = `M ${p[0].x} ${p[0].y}`;
     
     if (p.length === 3) {
        path += ` Q ${p[1].x} ${p[1].y} ${p[2].x} ${p[2].y}`;
     } else {
        for (let j = 1; j < p.length; j++) {
           path += ` L ${p[j].x} ${p[j].y}`;
        }
     }

     return (
        <g key={`edge-${i}`}>
           <path 
              d={path} 
              fill="none" 
              stroke="#06b6d4" 
              strokeWidth="2" 
              className="opacity-50"
           />
           {/* Invisible wider stroke for easier hovering/debugging */}
           <path 
              d={path} 
              fill="none" 
              stroke="transparent" 
              strokeWidth="10" 
           />
           {edge.label && (
             <foreignObject 
                x={p[Math.floor(p.length/2)].x - 50} 
                y={p[Math.floor(p.length/2)].y - 15} 
                width="100" 
                height="30"
             >
                <div className="text-[10px] text-cyan-300 bg-gray-900/80 px-1 py-0.5 rounded text-center border border-cyan-900/50 backdrop-blur-sm shadow-sm">
                   {edge.label}
                </div>
             </foreignObject>
           )}
        </g>
     );
  };

  return (
    <div className="w-full h-full overflow-hidden bg-gray-950 relative grid-pattern cursor-grab active:cursor-grabbing">
       <div ref={containerRef} className="absolute inset-0 outline-none transform-origin-0-0">
          <div className="relative" style={{ width: 2500, height: 2500 }}> 
            
            {/* SVG Layer for Edges */}
            <svg className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-visible">
               <defs>
                  <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill="#06b6d4" />
                  </marker>
               </defs>
               {edges.map((e, i) => renderEdge(e, i))}
            </svg>

            {/* HTML Layer for Nodes */}
            {nodes.map((node, idx) => {
               // Fallback coordinates if dagre failed (stacked vertically as backup)
               const x = node.x ?? 150;
               const y = node.y ?? (100 + idx * 120);
               const width = node.width;
               const height = node.height;
               
               const isActive = node.id === activeNodeId;
               
               // Offset coordinates to center the node
               const left = x - width / 2;
               const top = y - height / 2;

               if (node.type === 'feature') {
                  return (
                     <div 
                        key={node.id}
                        className={`absolute border-2 border-dashed rounded-xl transition-colors
                           ${isActive ? 'border-indigo-400 bg-indigo-900/10' : 'border-gray-700 bg-gray-900/50'}
                        `}
                        style={{
                           left, top, width, height,
                        }}
                        onMouseEnter={() => onHoverNode(node.id)}
                     >
                        <div className="absolute -top-3 left-4 px-2 bg-gray-950 text-xs font-mono text-gray-500">
                           {node.label}
                        </div>
                     </div>
                  );
               }

               return (
                  <div 
                     key={node.id}
                     className={`absolute rounded shadow-lg flex flex-col justify-center items-center px-4 transition-all cursor-pointer
                        ${node.status === 'verified' ? 'border-l-4 border-l-green-500' : 
                          node.status === 'broken' ? 'border-l-4 border-l-red-500' : 
                          'border-l-4 border-l-yellow-500'}
                        ${isActive ? 'bg-gray-700 ring-2 ring-indigo-500 z-10 scale-105' : 'bg-gray-800 hover:bg-gray-750'}
                     `}
                     style={{
                        left, top, width, height
                     }}
                     onMouseEnter={() => onHoverNode(node.id)}
                  >
                     <div className="text-sm font-semibold text-gray-200 text-center select-none">{node.label}</div>
                     <div className="text-[10px] text-gray-500 font-mono mt-1">{node.id}</div>
                  </div>
               );
            })}
          </div>
       </div>
       
       <div className="absolute bottom-4 right-4 bg-gray-900/80 backdrop-blur border border-gray-700 p-2 rounded text-[10px] text-gray-400 font-mono pointer-events-none select-none">
          Pan: Drag | Zoom: Scroll
       </div>
    </div>
  );
};

export default GraphView;