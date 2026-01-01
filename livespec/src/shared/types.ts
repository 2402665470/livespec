/**
 * LiveSpec V1.0 - Shared Type Definitions
 *
 * The Single Source of Truth for data structures shared between:
 * - Main Process (Node.js/Electron)
 * - Renderer Process (React)
 * - Internal Server (Express + WebSocket)
 *
 * IRON LAW: No Magic Coordinates
 * X/Y coordinates are NEVER stored in spec_graph.json.
 * They are calculated at runtime by Dagre and exist only in memory.
 */

// =============================================================================
// MARK: Enums
// =============================================================================

/**
 * Node Category - Determines rendering and behavior
 */
export enum SpecNodeCategory {
  /** Container/Folder node (renders as a dashed border cluster) */
  GROUP = 'group',
  /** Task/Leaf node (renders as a card) */
  SPEC = 'spec'
}

/**
 * Node Status - Determines visual indicators
 */
export enum SpecNodeStatus {
  /** Yellow indicator - Not yet verified */
  PENDING = 'pending',
  /** Green indicator - Tested and working */
  VERIFIED = 'verified',
  /** Red indicator - Broken or failing tests */
  BROKEN = 'broken',
  /** Blue checkmark - Approved and locked */
  APPROVED = 'approved'
}

/**
 * IPC Channel Names
 *
 * Defines all IPC communication channels between main and renderer processes.
 */
export enum IPCChannel {
  // App Control
  APP_OPEN_PROJECT = 'app:open-project',

  // Server Control
  SERVER_START = 'server:start',
  SERVER_STOP = 'server:stop',

  // Events (Main -> Renderer)
  GRAPH_UPDATE = 'graph:update',
  FILE_CHANGED = 'file:changed',
  SERVER_READY = 'server:ready'
}

// =============================================================================
// MARK: Data Structures
// =============================================================================

/**
 * Persistent Node (Stored in spec_graph.json)
 *
 * NOTE: Does NOT contain X/Y coordinates or dimensions.
 * Layout is calculated at runtime by Dagre.
 */
export interface SpecNode {
  /** Unique identifier (UUID format recommended) */
  id: string

  /** Node category for rendering differentiation */
  category: SpecNodeCategory

  /** Human-readable title/label */
  label: string

  /** Current status in the lifecycle */
  status: SpecNodeStatus

  /** Optional parent node ID (for hierarchical relationships) */
  parentId: string | null

  /** Optional detailed description */
  description?: string
}

/**
 * Runtime Layout Node (Memory Only)
 *
 * Extended version of SpecNode with layout properties.
 * Used by React Renderer + Dagre for positioning.
 * NEVER serialized to disk.
 */
export interface LayoutNode extends SpecNode {
  /** Calculated X position (center of node) */
  x: number

  /** Calculated Y position (center of node) */
  y: number

  /** Node width in pixels */
  width: number

  /** Node height in pixels */
  height: number
}

/**
 * Edge Connection
 *
 * Represents a directed relationship between two nodes.
 */
export interface SpecEdge {
  /** Source node ID */
  from: string

  /** Target node ID */
  to: string

  /** Optional label for the edge */
  label?: string

  /** Runtime-only: calculated Bezier curve points */
  points?: { x: number; y: number }[]
}

/**
 * The File Format (spec_graph.json)
 *
 * This is the exact structure stored on disk.
 * Flattened for easy serialization and git diffing.
 */
export interface SpecGraphData {
  /** Graph metadata */
  meta: {
    name: string
    version: string
  }

  /** All nodes in the graph */
  nodes: SpecNode[]

  /** All edges in the graph */
  edges: SpecEdge[]
}

// =============================================================================
// MARK: Project & Server Types
// =============================================================================

/**
 * Project metadata (runtime state, not persisted)
 */
export interface ProjectState {
  /** Root directory path (absolute) */
  rootPath: string | null

  /** Current graph data */
  graph: SpecGraphData | null

  /** Server status */
  serverRunning: boolean

  /** WebSocket server port */
  wsPort: number

  /** HTTP server port */
  httpPort: number
}

// =============================================================================
// MARK: IPC Payload Types
// =============================================================================

/**
 * Request payloads for IPC calls
 */
export interface IPCRequestPayloads {
  [IPCChannel.APP_OPEN_PROJECT]: undefined
  [IPCChannel.SERVER_START]: { wsPort?: number; httpPort?: number }
  [IPCChannel.SERVER_STOP]: undefined
}

/**
 * Response payloads for IPC calls
 */
export interface IPCResponsePayloads {
  [IPCChannel.APP_OPEN_PROJECT]: { rootPath: string | null; canceled: boolean }
  [IPCChannel.SERVER_START]: { success: boolean; wsPort: number; httpPort: number }
  [IPCChannel.SERVER_STOP]: { success: boolean }
}

/**
 * Event notification payloads (pushed from main to renderer)
 */
export interface IPCEventPayloads {
  /** Graph updated on disk */
  [IPCChannel.GRAPH_UPDATE]: { graph: SpecGraphData }

  /** File changed in project */
  [IPCChannel.FILE_CHANGED]: { filePath: string; content: string }

  /** Server is ready */
  [IPCChannel.SERVER_READY]: { wsPort: number; httpPort: number }
}

// =============================================================================
// MARK: WebSocket Types
// =============================================================================

/**
 * WebSocket message types
 */
export enum WSMessageType {
  /** Graph state sync */
  GRAPH_SYNC = 'graph:sync',

  /** File change notification */
  FILE_CHANGED = 'file:changed',

  /** Node updates */
  NODE_CREATED = 'node:created',
  NODE_UPDATED = 'node:updated',
  NODE_DELETED = 'node:deleted',

  /** Client connection */
  WELCOME = 'welcome',
  HELLO = 'hello',

  /** Cursor tracking for collaboration */
  CURSOR_MOVED = 'cursor:moved',

  /** Error */
  ERROR = 'error'
}

/**
 * Base WebSocket message
 */
export interface WSMessage<T extends WSMessageType = WSMessageType, P = unknown> {
  type: T
  timestamp: string
  payload: P
}

/**
 * Graph sync payload
 */
export interface WSGraphSyncPayload {
  graph: SpecGraphData
  fullSync: boolean
}

/**
 * File change payload
 */
export interface WSFileChangePayload {
  filePath: string
  content: string
}

/**
 * Error payload
 */
export interface WSErrorPayload {
  code: string
  message: string
  details?: unknown
}

// =============================================================================
// MARK: API Types
// =============================================================================

/**
 * Type-safe IPC API exposed to renderer process
 */
export interface ElectronAPI {
  // Project operations
  openProject: () => Promise<{ rootPath: string | null; canceled: boolean }>

  // Server operations
  startServer: (config?: { wsPort?: number; httpPort?: number }) => Promise<{
    success: boolean
    wsPort: number
    httpPort: number
  }>
  stopServer: () => Promise<{ success: boolean }>

  // Event listeners
  onGraphUpdate: (callback: (event: { graph: SpecGraphData }) => void) => () => void
  onFileChanged: (callback: (event: { filePath: string; content: string }) => void) => () => void
  onServerReady: (callback: (event: { wsPort: number; httpPort: number }) => void) => () => void
}

// =============================================================================
// MARK: Store Types (Zustand)
// =============================================================================

/**
 * Project slice state
 */
export interface ProjectStoreState {
  /** Current project root path */
  rootPath: string | null

  /** Current graph data */
  graph: SpecGraphData | null

  /** Server running state */
  serverRunning: boolean

  /** WebSocket port */
  wsPort: number

  /** HTTP port */
  httpPort: number

  /** Loading state */
  isLoading: boolean

  /** Error state */
  error: string | null

  /** Actions */
  openProject: () => Promise<void>
  setGraph: (graph: SpecGraphData) => void
  startServer: (config?: { wsPort?: number; httpPort?: number }) => Promise<void>
  stopServer: () => Promise<void>
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

/**
 * Graph slice state
 */
export interface GraphStoreState {
  /** Currently loaded graph */
  currentGraph: SpecGraphData | null

  /** Layout nodes (with X/Y coordinates) */
  layoutNodes: LayoutNode[]

  /** Currently selected node IDs */
  selectedNodeIds: Set<string>

  /** Currently hovered node ID */
  hoveredNodeId: string | null

  /** Loading state */
  isLoading: boolean

  /** Error state */
  error: string | null

  /** Actions */
  setCurrentGraph: (graph: SpecGraphData) => void
  setLayoutNodes: (nodes: LayoutNode[]) => void
  selectNodes: (nodeIds: string[] | string) => void
  clearSelection: () => void
  setHoveredNode: (nodeId: string | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

/**
 * UI slice state
 */
export interface UIStoreState {
  /** Theme mode */
  theme: 'light' | 'dark'

  /** Sidebar visibility */
  sidebarVisible: boolean

  /** Active view mode */
  viewMode: 'tree' | 'graph'

  /** Zoom level */
  zoom: number

  /** Pan offset */
  pan: { x: number; y: number }

  /** Actions */
  setTheme: (theme: 'light' | 'dark') => void
  toggleSidebar: () => void
  setViewMode: (mode: 'tree' | 'graph') => void
  setZoom: (zoom: number) => void
  setPan: (pan: { x: number; y: number }) => void
  resetView: () => void
}
