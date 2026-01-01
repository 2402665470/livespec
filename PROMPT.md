LiveSpec Master Product Requirements Document (PRD)

Project Name: LiveSpec Version: 1.0 (Production) Root Path: D:\MyProject\LiveSpec Reference Prototype: D:\MyProject\LiveSpec\demo\livespec (Contains HTML/CSS reference)
1. Project Overview & Philosophy

LiveSpec is a Spec-Driven Development tool that acts as a bridge between abstract requirements (a logical graph) and concrete verification (a clickable prototype).

    The Logic (Right Panel): A visual graph/tree defining "What to build" (Nodes & Edges).

    The Prototype (Left Panel): A "Guest" HTML application defining "What it looks like".

    The Synapse: A bi-directional link where clicking the UI highlights the Spec, and clicking the Spec navigates the UI.

2. The "Iron Laws" (Non-Negotiable Constraints)

    Strict Typing: You must strictly adhere to src/shared/types.ts. Do not invent new types. Use SpecNodeCategory, SpecNodeStatus, and IPCChannel as defined.

    No Magic Coordinates: The spec_graph.json file on disk NEVER stores X/Y coordinates for the graph layout. Layout is calculated at runtime by the Frontend using Dagre.

    Relational Data: The data source is Flat (Nodes Array + Edges Array), not a nested tree. You must build hierarchy or graph relationships programmatically.

    Visual Fidelity: You must reference the HTML/CSS in demo/livespec for all UI components. The production app must look and feel exactly like that prototype (Panzoom behavior, colors, shadows).

    No React Flow: Do NOT use React Flow or XYFlow. We use a custom engine based on panzoom + dagre + Absolute HTML Divs.

3. Technology Stack
A. Electron Main Process (The Backend)

    Runtime: Electron + Vite

    Server: Express.js (Embedded)

    Communication: WebSocket (ws) + IPC

    File Watcher: chokidar

B. Electron Renderer Process (The Host UI)

    Framework: React 18 + TypeScript

    State: Zustand

    Styling: Tailwind CSS (Utility classes only)

    Graphing: dagre (Algorithm) + panzoom (Canvas Interaction)

    Icons: lucide-react

C. The Guest Environment (The User's Prototype)

    Stack: Pure HTML + HTMX + Alpine.js (served statically by Express).

4. Development Roadmap (Phased Execution)

You are required to build this project in 5 Distinct Phases. Do not jump ahead.
Phase 1: Infrastructure & Types (The Foundation)

Goal: Set up the Electron boilerplate and define the data contracts.

    Initialize electron-vite (React + TS).

    Install dependencies: express, ws, chokidar, dagre, panzoom, lucide-react, zustand, clsx, tailwind-merge.

    Action: Create src/shared/types.ts containing the full definition provided by the user (SpecNode, SpecGraph, IPCChannel, etc.).

    Action: Set up the basic Electron Main/Renderer communication bridge (preload.ts) exposing strict APIs based on ElectronAPI interface.

Phase 2: The "Brain" (Server & File System)

Goal: Make the backend functional (Serving files, watching changes, broadcasting updates).

    Express Server (electron/server/http.ts):

        Serve the user's .LiveSpec folder statically.

        CRITICAL Middleware: Intercept every .html request. Inject a <script> tag pointing to /__livespec/client.js before </body>. This is the bridge script.

    WebSocket Server (electron/server/ws.ts):

        Implement the broadcast logic. When a file changes, notify all clients.

    File Watcher (electron/server/watcher.ts):

        Watch spec_graph.json. On change, validate and emit GRAPH_UPDATE.

        Watch *.html. On change, emit FILE_CHANGED (trigger hot reload).

    IPC Handlers (electron/main/index.ts):

        Implement app:open-project, graph:load, server:start.

Phase 3: The "Graph Engine" (The Hardest UI Part)

Goal: Implement the "Blueprint" view using Dagre + Panzoom (No React Flow).

    Layout Logic: Create a hook useAutoLayout.ts.

        Input: Flat nodes + edges.

        Process: Use dagre to calculate X/Y coordinates.

        Output: A Map of Node ID -> {x, y, width, height}.

    Canvas Component (src/components/Graph/GraphCanvas.tsx):

        Initialize panzoom on a container ref.

        Render Nodes as absolute <div> cards.

            Style them exactly like the demo/livespec prototype (Colors based on status).

        Render Edges as an <svg> layer behind nodes. Use Bezier curves.

    Interaction:

        Implement Drag-to-Pan (via panzoom).

        Click Node -> Update Zustand selectedNodeIds.

Phase 4: The "Tree Engine" & Sidebar

Goal: Implement the alternative Tree View and Layout.

    Tree Logic: Create a utility to convert Flat Nodes -> Nested Tree structure based on parentId.

    Sidebar Component:

        Implement a recursive Tree Item component.

        Match the styling of the prototype (Folder icons vs. Task icons).

    Layout:

        Use react-reflex or a simple flexbox splitter to separate the Sidebar (Host) and the Main View (Graph).

Phase 5: The "Synapse" (Bi-Directional Bridge)

Goal: Connect the Host (React) with the Guest (Iframe).

    The Client Script (electron/static/client.js):

        This script is injected into the Guest.

        It connects to WebSocket (for reload).

        It listens for clicks on [data-node-id].

        It uses window.parent.postMessage to send NODE_CLICKED to Host.

        It listens for Maps_TO from Host and triggers HTMX/Location change.

    The Host Logic:

        In React, listen to message events from the Iframe.

        On NODE_CLICKED: Find node in Graph, Center Panzoom on it, Highlight it.

        On Graph Node Click: Send Maps_TO to Iframe (lookup URL in router.json logic).

5. Detailed Component Specifications
A. The Data Structure (JSON Model)

The app reads spec_graph.json.

    Nodes: Flat array. Contains id, category (Group/Spec), status.

        Note: category: 'group' maps to "Feature/Folder". category: 'spec' maps to "Task".

    Edges: Flat array. Contains sourceId, targetId.

B. Graph Visualization Rules (Dagre)

    Direction: Left-to-Right (rankdir: 'LR').

    Groups: Nodes with category: 'group' must be rendered as "Clusters" (Compound Nodes) in Dagre. They act as containers visually wrapping their children.

    Styling:

        Pending -> Yellow Border.

        Verified -> Green Border.

        Broken -> Red Border.

C. The Guest Viewport

    Render an <iframe> pointing to http://localhost:[PORT]/index.html.

    The iframe must be responsive (100% width/height of its panel).

6. How to Start

Start by executing Phase 1. Generate the file structure, install packages, and write the src/shared/types.ts file EXACTLY as provided in the context. Do not proceed to Phase 2 until the types are solid.