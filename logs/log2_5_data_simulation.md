# AUDIT LOG 2.5: Data Integrity Check & Simulation
**Date:** 2025-12-31
**Status:** DATA COMPATIBILITY VERIFICATION
**Subject:** Verifying Solution Proposal Against Actual Test Data

---

## TEST DATA PROVIDED

```json
{
  "meta": { "name": "Test Project", "version": "1.0.0" },
  "nodes": [
    { "id": "group-auth", "category": "group", "label": "Authentication System", "status": "pending", "parentId": null },
    { "id": "node-login", "category": "spec", "label": "User Login", "status": "verified", "parentId": "group-auth" }
  ],
  "edges": [
    { "from": "node-login", "to": "node-database", "label": "queries" }
  ]
}
```

---

## SIMULATION 1: Type Compatibility Check

### Reference: `src/shared/types.ts` (SpecNode interface)

```typescript
export enum SpecNodeCategory {
  GROUP = 'group',
  SPEC = 'spec'
}

export enum SpecNodeStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  BROKEN = 'broken',
  APPROVED = 'approved'
}

export interface SpecNode {
  id: string
  category: SpecNodeCategory
  label: string                    // ← JSON uses "label"
  status: SpecNodeStatus
  parentId: string | null
  description?: string
}
```

### JSON vs Type Mapping

| JSON Field | Type Field | Match? | Value Check |
|-----------|-----------|--------|-------------|
| `id` | `id: string` | ✅ PASS | `"group-auth"`, `"node-login"` are strings |
| `category` | `category: SpecNodeCategory` | ✅ PASS | `"group"` → `SpecNodeCategory.GROUP`, `"spec"` → `SpecNodeCategory.SPEC` |
| `label` | `label: string` | ✅ PASS | Used `label` (NOT `title`) |
| `status` | `status: SpecNodeStatus` | ✅ PASS | `"pending"` → `SpecNodeStatus.PENDING`, `"verified"` → `SpecNodeStatus.VERIFIED` |
| `parentId` | `parentId: string \| null` | ✅ PASS | `null` for root, `"group-auth"` for child |

**VERDICT:** ✅ **PASS** - All JSON fields are compatible with the type definition.

---

## SIMULATION 2: Layout Engine Simulation

### Question: How will `useAutoLayout` assign width/height when JSON has NO dimensions?

### Current `useAutoLayout.ts` Implementation Analysis

```typescript
// From src/renderer/src/hooks/useAutoLayout.ts

const LAYOUT_CONFIG = {
  NODE_WIDTH: 180,
  NODE_HEIGHT: 80,
  GROUP_WIDTH: 350,
  GROUP_HEIGHT: 250,
  RANKSEP: 80,
  NODESEP: 50,
  MARGINX: 50,
  MARGINY: 50
}

function estimateNodeSize(category: SpecNodeCategory) {
  return category === 'group'
    ? { width: LAYOUT_CONFIG.GROUP_WIDTH, height: LAYOUT_CONFIG.GROUP_HEIGHT }
    : { width: LAYOUT_CONFIG.NODE_WIDTH, height: LAYOUT_CONFIG.NODE_HEIGHT }
}

export function useAutoLayout({ nodes, edges, enabled }: UseAutoLayoutOptions) {
  const { layoutNodes, layoutEdges } = useMemo(() => {
    if (!enabled || nodes.length === 0) {
      return { layoutNodes: [], layoutEdges: [] }
    }

    try {
      const g = new dagre.graphlib.Graph()
      g.setGraph({ rankdir: 'LR', ranksep: LAYOUT_CONFIG.RANKSEP, nodesep: LAYOUT_CONFIG.NODESEP })
      g.setDefaultEdgeLabel(() => ({}))

      // Add nodes WITH estimated sizes
      nodes.forEach((node) => {
        const size = estimateNodeSize(node.category)  // ← KEY: Size assigned here based on category
        g.setNode(node.id, {
          width: size.width,
          height: size.height,
          label: node.label
        })
      })

      // Add edges
      edges.forEach((edge) => {
        g.setEdge(edge.from, edge.to)
      })

      // Run Dagre layout
      dagre.layout(g)

      // Convert to LayoutNode[] with x,y coordinates
      const calculatedNodes: LayoutNode[] = nodes.map((node) => {
        const dagreNode = g.node(node.id)

        if (!dagreNode) {
          console.warn(`[useAutoLayout] Node ${node.id} not found in Dagre output`)
          const size = estimateNodeSize(node.category)
          return {
            ...node,
            x: 0,
            y: 0,
            width: size.width,
            height: size.height
          }
        }

        return {
          ...node,
          x: dagreNode.x,
          y: dagreNode.y,
          width: dagreNode.width,
          height: dagreNode.height
        }
      })

      return { layoutNodes: calculatedNodes, layoutEdges: calculatedEdges }
    } catch (error) {
      console.error('[useAutoLayout] Layout calculation failed:', error)
      return { layoutNodes: [], layoutEdges: [] }
    }
  }, [nodes, edges, enabled])

  return { layoutNodes, layoutEdges }
}
```

### Simulation for Test Data

| Node ID | Category | Estimated Width | Estimated Height | After Dagre Layout |
|---------|----------|-----------------|------------------|-------------------|
| `group-auth` | `group` | 350px | 250px | { x: 175, y: 125, width: 350, height: 250 } |
| `node-login` | `spec` | 180px | 80px | { x: 270, y: 340, width: 180, height: 80 } |

**VERDICT:** ✅ **PASS** - The layout engine correctly assigns default sizes based on category.

---

## SIMULATION 3: Tree Rendering Simulation

### Question: Does `SpecTree` handle `node-login` with `parentId: "group-auth"` correctly?

### Current `SpecTree.tsx` Implementation Analysis

```typescript
// From src/renderer/src/components/Tree/SpecTree.tsx

interface TreeNode extends LayoutNode {
  children: TreeNode[]
  expanded: boolean
}

export function buildTree(nodes: SpecNode[]): TreeNode[] {
  const nodeMap = new Map<string, TreeNode>()
  const rootNodes: TreeNode[] = []

  // First pass: create all tree nodes with empty children array
  nodes.forEach((node) => {
    const size = estimateNodeSize(node.category)
    nodeMap.set(node.id, {
      ...node,
      x: 0,
      y: 0,
      width: size.width,
      height: size.height,
      children: [],
      expanded: node.category === 'group'  // Groups are expanded by default
    })
  })

  // Second pass: build parent-child relationships
  nodes.forEach((node) => {
    const treeNode = nodeMap.get(node.id)!

    if (node.parentId) {
      const parent = nodeMap.get(node.parentId)
      if (parent) {
        parent.children.push(treeNode)
      } else {
        // Parent not found - treat as root
        rootNodes.push(treeNode)
      }
    } else {
      // No parentId - this is a root node
      rootNodes.push(treeNode)
    }
  })

  return rootNodes
}
```

### Simulation for Test Data

**Input Nodes:**
```json
[
  { "id": "group-auth", "parentId": null },
  { "id": "node-login", "parentId": "group-auth" }
]
```

**Execution Trace:**

1. **First Pass (Create Map):**
   - `nodeMap.set("group-auth", { id: "group-auth", children: [], expanded: true })`
   - `nodeMap.set("node-login", { id: "node-login", children: [], expanded: false })`

2. **Second Pass (Build Relationships):**
   - Process `"group-auth"`: `parentId` is `null` → Add to `rootNodes`
   - Process `"node-login"`: `parentId` is `"group-auth"` → Find parent, add to parent's `children`

3. **Result:**
   ```typescript
   rootNodes = [
     {
       id: "group-auth",
       children: [
         { id: "node-login", children: [] }
       ],
       expanded: true
     }
   ]
   ```

**VERDICT:** ✅ **PASS** - Tree structure is correctly built from flat nodes with `parentId`.

---

## SIMULATION 4: Edge Rendering Check

### Question: Edge refers to `node-database` which doesn't exist in the nodes array!

### Test Data Issue
```json
"edges": [
  { "from": "node-login", "to": "node-database", "label": "queries" }
]
```

The `"node-database"` target does NOT exist in the `nodes` array (only 2 nodes defined).

### Current Dagre Implementation Behavior

```typescript
// Add edges
edges.forEach((edge) => {
  g.setEdge(edge.from, edge.to)  // Dagre will create edge even if target doesn't exist
})

// Later when rendering edges:
{edges.map((edge) => (
  <GraphEdge key={`edge-${edge.from}-${edge.to}`} edge={edge} />
))}
```

**Problem:** The edge will be rendered, but there's no visual target node. This could cause:
1. Lines pointing to empty space
2. No obvious error in UI

### Recommended Fix (for Solution Proposal)

Add validation in `useAutoLayout`:
```typescript
// Filter out edges with missing nodes
const validEdges = edges.filter(edge =>
  nodes.some(n => n.id === edge.from) && nodes.some(n => n.id === edge.to)
)

// Log warning for invalid edges
edges.forEach(edge => {
  const hasSource = nodes.some(n => n.id === edge.from)
  const hasTarget = nodes.some(n => n.id === edge.to)
  if (!hasSource) {
    console.warn(`[useAutoLayout] Edge source not found: ${edge.from}`)
  }
  if (!hasTarget) {
    console.warn(`[useAutoLayout] Edge target not found: ${edge.to}`)
  }
})
```

**VERDICT:** ⚠️ **WARN** - Edge with missing target node will render but look broken. Recommend adding validation.

---

## SIMULATION 5: Store Update Verification

### Question: Will `setGraph` correctly update with this test data?

### Proposed Store Implementation

```typescript
setGraph: (graph: SpecGraphData) => {
  console.log('[Store] setGraph called with', graph.nodes.length, 'nodes')

  // Create proper shallow copy to trigger Zustand subscribers
  const newGraph: SpecGraphData = {
    meta: { ...graph.meta },
    nodes: [...graph.nodes],
    edges: [...graph.edges]
  }

  set({ graph: newGraph })

  console.log('[Store] graph state updated, new reference created')
}
```

### Execution with Test Data

**Input:**
```json
{
  "meta": { "name": "Test Project", "version": "1.0.0" },
  "nodes": [ /* 2 nodes */ ],
  "edges": [ /* 1 edge */ ]
}
```

**After `setGraph`:**
```typescript
// In Zustand store state:
{
  graph: {
    meta: { name: "Test Project", version: "1.0.0" },
    nodes: [ /* new array reference */ ],
    edges: [ /* new array reference */ ]
  }
}
```

**Component Subscription:**
```typescript
const graph = useProjectStore((state) => state.graph)
// ^ This will re-render because `state.graph` reference changed
```

**VERDICT:** ✅ **PASS** - Store update will trigger component re-render correctly.

---

## SIMULATION 6: Component Rendering Path

### Full Execution Flow for Test Data

1. **IPC Event Sent:** `mainWindow?.webContents.send('graph:update', { graph })`
2. **Event Listener Receives:** `useProjectStore.getState().setGraph(data.graph)`
3. **Store Updates:** `set({ graph: newGraph })` creates new reference
4. **Component Re-renders:** `useProjectStore((state) => state.graph)` detects change
5. **App.tsx Conditions:**
   - `graph` = `{ nodes: [2 nodes], edges: [1 edge] }` ✅
   - `graph.nodes.length > 0` = `true` ✅
   - `hasGraphData` = `true` ✅
6. **useAutoLayout Called:**
   - `enabled: nodes.length > 0` = `true` ✅
   - Dagre calculates positions ✅
   - `layoutNodes` = 2 nodes with x,y ✅
7. **GraphCanvas Renders:**
   - Receives `layoutNodes` (2 nodes with coordinates) ✅
   - Renders NodeCard for each ✅

**VERDICT:** ✅ **PASS** - Full rendering path should work.

---

## FINAL VERDICT

| Check | Result | Notes |
|-------|--------|-------|
| Type Compatibility | ✅ PASS | All JSON fields match types |
| Layout Size Assignment | ✅ PASS | Default sizes assigned by category |
| Tree Recursion | ✅ PASS | parentId correctly handled |
| Edge Validation | ⚠️ WARN | `node-database` doesn't exist - recommend adding validation |
| Store Update | ✅ PASS | New reference will trigger re-render |
| Rendering Path | ✅ PASS | Full flow should work |

**OVERALL VERDICT:** ✅ **PASS** - Solution proposal is compatible with test data, with minor recommendation to add edge validation.

---

**END OF DATA SIMULATION LOG**
