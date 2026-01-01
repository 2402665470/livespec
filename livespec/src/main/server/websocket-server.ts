/**
 * WebSocket Server
 *
 * Provides real-time collaboration and live updates
 */

import { WebSocketServer as WSServer, WebSocket } from 'ws'
import { WSMessageType, type WSMessage } from '../../shared/types'

let wsServer: WSServer | null = null
const clients = new Map<WebSocket, string>() // ws -> clientId
let currentGraphId: string | null = null

export interface WSServerOptions {
  port: number
  graphId?: string
}

export function startWebSocketServer(options: WSServerOptions): void {
  if (wsServer) {
    stopWebSocketServer()
  }

  currentGraphId = options.graphId || null

  wsServer = new WSServer({ port: options.port })

  wsServer.on('listening', () => {
    console.log(`WebSocket server listening on port ${options.port}`)
  })

  wsServer.on('connection', (ws, req) => {
    const clientId = generateClientId()

    console.log(`New WebSocket connection: ${clientId} from ${req.socket.remoteAddress}`)

    // Store client
    clients.set(ws, clientId)

    // Send welcome message
    sendWelcome(ws, clientId)

    // Handle incoming messages
    ws.on('message', (data: Buffer) => {
      try {
        const message: WSMessage = JSON.parse(data.toString())
        handleMessage(ws, message)
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err)
        sendError(ws, 'INVALID_MESSAGE', 'Failed to parse message')
      }
    })

    // Handle disconnect
    ws.on('close', () => {
      console.log(`WebSocket disconnected: ${clientId}`)
      clients.delete(ws)
    })

    ws.on('error', (err) => {
      console.error(`WebSocket error for ${clientId}:`, err)
    })
  })

  wsServer.on('error', (err) => {
    console.error('WebSocket server error:', err)
  })
}

export function stopWebSocketServer(): void {
  if (wsServer) {
    wsServer.close()
    wsServer = null
    clients.clear()
    console.log('WebSocket server stopped')
  }
}

export function broadcast<T extends WSMessageType>(message: WSMessage<T>): void {
  if (!wsServer) return

  const data = JSON.stringify(message)
  wsServer.clients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(data)
    }
  })
}

function generateClientId(): string {
  return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

function sendWelcome(ws: WebSocket, _clientId: string): void {
  const message: WSMessage<WSMessageType.WELCOME> = {
    type: WSMessageType.WELCOME,
    timestamp: new Date().toISOString(),
    payload: {
      serverId: 'livespec_server',
      version: '1.0.0',
      graphId: currentGraphId || undefined
    }
  }
  ws.send(JSON.stringify(message))
}

function sendError(ws: WebSocket, code: string, message: string, details?: unknown): void {
  const errorMessage: WSMessage<WSMessageType.ERROR> = {
    type: WSMessageType.ERROR,
    timestamp: new Date().toISOString(),
    payload: { code, message, details }
  }
  ws.send(JSON.stringify(errorMessage))
}

function handleMessage(_ws: WebSocket, message: WSMessage): void {
  switch (message.type) {
    case WSMessageType.HELLO:
      // Client hello - already handled clientId assignment
      console.log('Client hello:', message.payload)
      break

    case WSMessageType.CURSOR_MOVED:
      // Broadcast cursor position to other clients
      broadcast({
        type: WSMessageType.CURSOR_MOVED,
        timestamp: new Date().toISOString(),
        payload: message.payload
      })
      break

    default:
      console.warn('Unknown WebSocket message type:', message.type)
  }
}

export function setGraphId(graphId: string): void {
  currentGraphId = graphId
}

export function getConnectedClients(): string[] {
  return Array.from(clients.values())
}

export function getClientCount(): number {
  return clients.size
}
