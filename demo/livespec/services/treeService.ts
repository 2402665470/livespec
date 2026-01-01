import { SpecNode, NestedTreeNode } from '../types';

export const getNestedTree = (nodes: SpecNode[]): NestedTreeNode[] => {
  const nodeMap = new Map<string, NestedTreeNode>();
  const rootNodes: NestedTreeNode[] = [];

  // 1. Create all node objects
  nodes.forEach(node => {
    nodeMap.set(node.id, { ...node, children: [] });
  });

  // 2. Build relationships
  nodes.forEach(node => {
    const nestedNode = nodeMap.get(node.id)!;
    if (node.parentId && nodeMap.has(node.parentId)) {
      const parent = nodeMap.get(node.parentId)!;
      parent.children.push(nestedNode);
    } else {
      rootNodes.push(nestedNode);
    }
  });

  return rootNodes;
};

export const findNodeById = (nodes: NestedTreeNode[], id: string): NestedTreeNode | null => {
    for (const node of nodes) {
        if (node.id === id) return node;
        if (node.children) {
            const found = findNodeById(node.children, id);
            if (found) return found;
        }
    }
    return null;
};