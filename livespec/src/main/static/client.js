/**
 * LiveSpec Client Bridge Script
 *
 * This script is automatically injected into every HTML page served by LiveSpec.
 * It provides real-time communication between the Guest (user's HTML) and Host (LiveSpec app).
 *
 * Features:
 * - WebSocket connection with auto-reconnect
 * - Hot-reload on file changes
 * - Node click tracking
 * - Host -> Guest navigation commands
 */

;(function () {
  'use strict'

  // =============================================================================
  // MARK: CLIENT-SIDE IDEMPOTENCY CHECK
  // =============================================================================

  if (window.__LIVESPEC_INITIALIZED__) {
    console.log('[LiveSpec] Bridge already initialized, skipping')
    return
  }

  window.__LIVESPEC_INITIALIZED__ = true
  console.log('[LiveSpec] Initializing bridge...')

  // =============================================================================
  // MARK: CONFIGURATION
  // =============================================================================

  const CONFIG = {
    // WebSocket port (default: 3899)
    wsPort: 3899,
    // Reconnection delay in ms
    reconnectDelay: 2000,
    // Max reconnection attempts (0 = infinite)
    maxReconnectAttempts: 0,
    // Enable debug logging
    debug: true
  }

  // Detect WS port from server (injected via query param or meta tag)
  const wsPortMeta = document.querySelector('meta[name="livespec:ws-port"]')
  if (wsPortMeta) {
    CONFIG.wsPort = parseInt(wsPortMeta.getAttribute('content') || '3899', 10)
  }

  // =============================================================================
  // MARK: STATE
  // =============================================================================

  let ws = null
  let reconnectTimer = null
  let reconnectAttempts = 0
  let isManualClose = false

  // =============================================================================
  // MARK: WEBSOCKET CONNECTION
  // =============================================================================

  function connect() {
    if (ws && (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN)) {
      logDebug('WebSocket already connecting or connected')
      return
    }

    const wsUrl = `ws://localhost:${CONFIG.wsPort}`
    logDebug(`Connecting to WebSocket: ${wsUrl}`)

    try {
      ws = new WebSocket(wsUrl)

      ws.onopen = handleOpen
      ws.onclose = handleClose
      ws.onerror = handleError
      ws.onmessage = handleMessage
    } catch (err) {
      logDebug('Failed to create WebSocket:', err)
      scheduleReconnect()
    }
  }

  function handleOpen() {
    logDebug('WebSocket connected')
    reconnectAttempts = 0

    // Send hello message
    send({
      type: 'hello',
      timestamp: new Date().toISOString(),
      payload: {
        clientId: generateClientId(),
        clientType: 'guest',
        url: window.location.href,
        version: '1.0.0'
      }
    })
  }

  function handleClose(event) {
    logDebug('WebSocket closed:', event.code, event.reason)

    ws = null

    if (!isManualClose) {
      scheduleReconnect()
    }
  }

  function handleError(error) {
    logDebug('WebSocket error:', error)
  }

  function handleMessage(event) {
    try {
      const message = JSON.parse(event.data)
      logDebug('Received message:', message.type)

      switch (message.type) {
        case 'FILE_CHANGED':
          handleFileChanged(message.payload)
          break

        case 'GRAPH_UPDATE':
          handleGraphUpdate(message.payload)
          break

        case 'welcome':
          logDebug('Server welcome:', message.payload)
          break

        default:
          logDebug('Unknown message type:', message.type)
      }
    } catch (err) {
      logDebug('Failed to parse message:', err)
    }
  }

  function scheduleReconnect() {
    if (isManualClose) return

    if (
      CONFIG.maxReconnectAttempts > 0 &&
      reconnectAttempts >= CONFIG.maxReconnectAttempts
    ) {
      logDebug('Max reconnection attempts reached')
      return
    }

    logDebug(`Reconnecting in ${CONFIG.reconnectDelay}ms...`)
    reconnectAttempts++

    reconnectTimer = setTimeout(() => {
      connect()
    }, CONFIG.reconnectDelay)
  }

  function send(data) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data))
    } else {
      logDebug('Cannot send message: WebSocket not connected')
    }
  }

  function disconnect() {
    isManualClose = true

    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }

    if (ws) {
      ws.close()
      ws = null
    }
  }

  // =============================================================================
  // MARK: MESSAGE HANDLERS
  // =============================================================================

  function handleFileChanged(payload) {
    logDebug('File changed:', payload.filePath)

    // Reload the page to get the latest version
    console.log('[LiveSpec] File changed, reloading page...')
    window.location.reload()
  }

  function handleGraphUpdate(payload) {
    logDebug('Graph updated:', payload.graph)

    // Notify parent window about graph update
    if (window.parent !== window) {
      window.parent.postMessage(
        {
          type: 'GRAPH_UPDATED',
          graph: payload.graph
        },
        '*'
      )
    }
  }

  // =============================================================================
  // MARK: GUEST -> HOST COMMUNICATION
  // =============================================================================

  function setupNodeClickListener() {
    // Use event delegation to listen for clicks on [data-node-id] elements
    document.addEventListener('click', (event) => {
      const target = event.target.closest('[data-node-id]')

      if (!target) return

      const nodeId = target.getAttribute('data-node-id')
      if (!nodeId) return

      logDebug('Node clicked:', nodeId)

      // Prevent default behavior if it's an anchor tag
      if (target.tagName === 'A') {
        event.preventDefault()
      }

      // Send message to parent window (Host)
      if (window.parent !== window) {
        window.parent.postMessage(
          {
            type: 'NODE_CLICKED',
            nodeId: nodeId,
            url: window.location.href
          },
          '*'
        )
      }
    })

    logDebug('Node click listener registered')
  }

  // =============================================================================
  // MARK: HOST -> GUEST COMMUNICATION
  // =============================================================================

  function setupCommandListener() {
    window.addEventListener('message', (event) => {
      // TODO: Add origin validation for security
      const { data } = event

      if (!data || !data.type) return

      switch (data.type) {
        case 'NAVIGATE_TO':
          handleNavigateCommand(data)
          break

        case 'HIGHLIGHT_NODE':
          handleHighlightNode(data)
          break

        default:
          logDebug('Unknown command:', data.type)
      }
    })

    logDebug('Command listener registered')
  }

  function handleNavigateCommand(data) {
    logDebug('Navigate command:', data.url)

    if (data.url) {
      if (data.reload) {
        window.location.href = data.url
      } else {
        // Use HTMX or other navigation method if available
        // For now, just set the href
        window.location.href = data.url
      }
    }
  }

  function handleHighlightNode(data) {
    logDebug('Highlight node:', data.nodeId)

    // Remove existing highlights
    document.querySelectorAll('[data-node-id].__livespec_highlighted__').forEach((el) => {
      el.classList.remove('__livespec_highlighted__')
      el.style.outline = ''
    })

    // Add highlight to target node
    const target = document.querySelector(`[data-node-id="${data.nodeId}"]`)
    if (target) {
      target.classList.add('__livespec_highlighted__')
      target.style.outline = '2px solid #22d3ee'
      target.style.outlineOffset = '2px'

      // Scroll into view
      target.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  // =============================================================================
  // MARK: UTILITIES
  // =============================================================================

  function generateClientId() {
    return `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  function logDebug(...args) {
    if (CONFIG.debug) {
      console.log('[LiveSpec]', ...args)
    }
  }

  // =============================================================================
  // MARK: INITIALIZATION
  // =============================================================================

  function init() {
    logDebug('Bridge initialized')

    // Setup communication
    setupNodeClickListener()
    setupCommandListener()

    // Connect to WebSocket
    connect()

    // Expose API globally
    window.__LIVESPEC_BRIDGE__ = {
      version: '1.0.0',
      initialized: true,
      connected: false,
      disconnect,
      send,
      reconnect: connect
    }

    logDebug('Bridge ready')
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    disconnect()
  })
})()
