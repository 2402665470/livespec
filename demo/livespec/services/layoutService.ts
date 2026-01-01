import dagre from 'dagre';
import { SpecNode, SpecEdge } from '../types';

export const calculateLayout = (nodes: SpecNode[], edges: SpecEdge[]): { nodes: SpecNode[], edges: SpecEdge[] } => {
  // Handle Dagre ESM/CommonJS interop
  // @ts-ignore
  const dagreLib = dagre.default || dagre;
  
  if (!dagreLib || !dagreLib.graphlib) {
     console.error("Dagre library not loaded correctly. Layout calculation skipped.", dagre);
     return { nodes, edges };
  }

  const g = new dagreLib.graphlib.Graph({ compound: true });
  
  g.setGraph({ 
    rankdir: 'LR', 
    nodesep: 50, 
    ranksep: 100,
    marginx: 50,
    marginy: 50
  });

  g.setDefaultEdgeLabel(() => ({}));

  // 1. Add nodes
  nodes.forEach(node => {
    g.setNode(node.id, { 
      label: node.label, 
      width: node.width, 
      height: node.height 
    });

    if (node.parentId) {
      g.setParent(node.id, node.parentId);
    }
  });

  // 2. Add edges
  edges.forEach(edge => {
    g.setEdge(edge.from, edge.to);
  });

  // 3. Calculate Layout
  dagreLib.layout(g);

  // 4. Map back results
  const layoutNodes = nodes.map(node => {
    const dagreNode = g.node(node.id);
    return {
      ...node,
      x: dagreNode.x,
      y: dagreNode.y,
      // Update width/height if dagre resized compound nodes (groups)
      width: dagreNode.width,
      height: dagreNode.height
    };
  });

  const layoutEdges = edges.map(edge => {
    const dagreEdge = g.edge(edge.from, edge.to);
    return {
      ...edge,
      points: dagreEdge.points
    };
  });

  return { nodes: layoutNodes, edges: layoutEdges };
};