export type NodeStatus = 'approved' | 'pending' | 'verified' | 'broken';
export type NodeType = 'feature' | 'task';
export type ViewMode = 'tree' | 'graph';

export interface SpecNode {
  id: string;
  type: NodeType;
  label: string;
  parentId: string | null;
  status: NodeStatus;
  width: number;
  height: number;
  // Layout properties (calculated at runtime)
  x?: number;
  y?: number;
  // Content properties
  desc?: string;
  criteria?: string[];
}

export interface SpecEdge {
  from: string;
  to: string;
  label?: string;
  // Layout properties
  points?: { x: number; y: number }[];
}

export interface SpecData {
  viewMode: ViewMode;
  meta: {
    name: string;
    version: string;
  };
  nodes: SpecNode[];
  edges: SpecEdge[];
  layoutNodes: SpecNode[]; // Populated by Dagre
}

// Helper type for the recursive tree structure used in TreeView
export interface NestedTreeNode extends SpecNode {
  children: NestedTreeNode[];
  expanded?: boolean;
}

export type TreeNode = NestedTreeNode;
