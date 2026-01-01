CLAUDE.md - LiveSpec Project Constitution
1. Project Identity & Philosophy

Name: LiveSpec Core Concept: A Spec-Driven Development verification tool that bridges abstract requirements (JSON) with concrete UI prototypes (HTML). Motto: "Spec is the Structure (Nodes), Tasks are the Flow (Edges), UI is the Verification."
🚨 Prime Directive (The "Iron Laws")

    Single Source of Truth: All logical data comes from spec_graph.json (Relational/Flat structure). Do NOT create nested JSON structures for storage.

    Separation of Concerns:

        Host (LiveSpec): The Electron app. It observes and visualizes.

        Guest (User Project): The .LiveSpec folder. It contains raw HTML/HTMX.

        Never mix them: The Host logic must never leak into the Guest HTML files, except via the injected client.js.

    No Magic Coordinates: The spec_graph.json does NOT store X/Y coordinates for the graph. The Frontend (React) MUST calculate layout dynamically using dagre. Do not attempt to hardcode or hallucinate x/y values in the JSON.

2. Technology Stack & Architecture
Backend (Electron Main Process)

    Runtime: Electron (Vite + TypeScript)

    Local Server: Express.js (serving .LiveSpec static files)

    Watcher: Chokidar (observing spec_graph.json and *.html)

    Live Update: ws (WebSocket) for pushing updates to both Host and Guest.

Frontend (Electron Renderer Process)

    Framework: React 18 + TypeScript

    State Management: Zustand (Strictly typed stores)

    Styling: Tailwind CSS (No CSS modules, no .css files, just utility classes)

    Graph Engine: dagre (Layout Algorithm) + Custom React Components on panzoom canvas. (We do NOT use React Flow).

    Icons: lucide-react

3. Data Structures (The "Law")

Always adhere to these TypeScript interfaces. Do not invent new fields without explicit instruction.
TypeScript

// Shared Types (src/shared/types.ts)

// 1. The Node (Entity)
export interface SpecNode {
  id: string;          // Global Unique ID
  type: 'feature' | 'task';
  label: string;
  parentId: string | null; // The Hierarchy Link
  status: 'pending' | 'verified' | 'broken' | 'approved';
  description?: string;
  // Runtime-only layout data (injected by Dagre, NOT in JSON)
  layout?: { x: number; y: number; width: number; height: number };
}

// 2. The Edge (Flow/Logic)
export interface SpecEdge {
  from: string;        // Source Node ID
  to: string;          // Target Node ID
  label?: string;
  type?: 'default' | 'success' | 'failure';
}

// 3. The File Format
export interface SpecGraphData {
  meta: { name: string; version: string };
  nodes: SpecNode[];
  edges: SpecEdge[];
}

4. Communication Protocol (The "Synapse")

The Host (React) and Guest (Iframe) communicate via window.postMessage.
Host to Guest (Commands)

    Event: Maps_TO

    Payload: { nodeId: string, url: string }

    Behavior: The Guest must perform an HTMX swap or page redirect to show the UI for that node.

Guest to Host (Events)

    Event: NODE_CLICKED

    Payload: { nodeId: string }

    Behavior: The Host must locate the node in the Graph/Tree, center the camera, and highlight it.

5. Coding Standards
TypeScript

    Strict Mode: Enabled. No any. Use unknown or distinct generic types if necessary.

    Interfaces: define all data shapes in src/shared/types.ts.

React Components

    Functional Only: Use Hooks (useEffect, useMemo).

    File Structure: src/components/[Domain]/[Component].tsx (e.g., src/components/Graph/NodeCard.tsx).

    Tailwind: Use full class names. Do not abstract Tailwind classes into JS variables unless it's a reusable cva (Class Variance Authority) component.

File System Operations

    All file reads/writes happen in Electron Main Process.

    Renderer Process uses window.electron.ipcRenderer.invoke() to request file operations.

    Never import fs or path in React components.

6. Implementation Constraints (For AI Generation)

    When modifying spec_graph.json:

        Always preserve the referential integrity. If you delete a Node, you must delete all Edges connected to it.

    When implementing the Graph View:

        Use dagre to calculate layout in a useEffect.

        Map the output back to React state.

        Render SVG lines behind the HTML Node Cards.

    When implementing the Server:

        The middleware MUST inject a client-side script (<script src="/__livespec/client.js"></script>) into every HTML response to handle the WebSocket connection and postMessage bridge.

End of Constitution

If the user asks to implement a feature that contradicts these rules (e.g., "Add x/y coordinates to the JSON"), you must politely remind them of the "Prime Directive" (Layout is dynamic) before proceeding.