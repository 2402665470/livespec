/**
 * GuestViewport Component
 *
 * Renders the user's HTML prototype in an iframe
 * Handles bi-directional communication with the host
 * Icons: Phosphor (matching prototype)
 */

import { useEffect, useRef, useState } from 'react'
import { Globe } from 'phosphor-react'
import { useProjectStore } from '../../stores/project-store'

interface GuestViewportProps {
  onNodeClick?: (nodeId: string) => void
}

export function GuestViewport({ onNodeClick }: GuestViewportProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const httpPort = useProjectStore((state) => state.httpPort)
  const serverRunning = useProjectStore((state) => state.serverRunning)
  const [iframeLoaded, setIframeLoaded] = useState(false)

  // Listen for messages from the iframe (Guest → Host)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const { data } = event
      if (!data || !data.type) return

      console.log('[GuestViewport] Received message:', data.type, data)

      switch (data.type) {
        case 'NODE_CLICKED':
          if (data.nodeId && onNodeClick) {
            onNodeClick(data.nodeId)
          }
          break

        case 'GRAPH_UPDATED':
          console.log('[GuestViewport] Graph updated:', data.graph)
          break

        default:
          console.log('[GuestViewport] Unknown message type:', data.type)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => {
      window.removeEventListener('message', handleMessage)
    }
  }, [onNodeClick])

  // Handle iframe load
  const handleIframeLoad = () => {
    console.log('[GuestViewport] Iframe loaded')
    setIframeLoaded(true)
  }

  // Construct iframe URL
  const iframeUrl = serverRunning
    ? `http://localhost:${httpPort}/interactive-test.html`
    : 'about:blank'

  return (
    <div className="w-full h-full bg-white relative">
      {/* Iframe */}
      <iframe
        ref={iframeRef}
        src={iframeUrl}
        className="w-full h-full border-0"
        onLoad={handleIframeLoad}
        title="Guest Viewport"
        sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
      />

      {/* Loading indicator */}
      {!iframeLoaded && serverRunning && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white z-10">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mb-4"></div>
          <p className="text-gray-600 font-medium">Loading guest prototype...</p>
        </div>
      )}

      {/* Empty state */}
      {!serverRunning && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 z-10">
          <Globe size={64} weight="thin" className="text-gray-400 mb-4" />
          <p className="text-gray-600 text-lg font-medium">Server not running</p>
          <p className="text-gray-500 text-sm mt-2">
            Start the server to view your prototype
          </p>
        </div>
      )}
    </div>
  )
}
