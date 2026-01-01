/**
 * GuestViewport Component (Refactored)
 *
 * Renders the user's HTML prototype in an iframe.
 * This component is now simplified and no longer handles message listening itself.
 * All communication is handled by the parent App component.
 */

import { useEffect, useRef, useState } from 'react';
import { Globe } from 'phosphor-react';
import { useProjectStore } from '../../stores/project-store';

// The onNodeClick prop is no longer needed.
interface GuestViewportProps {}

export function GuestViewport({}: GuestViewportProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const httpPort = useProjectStore((state) => state.httpPort);
  const serverRunning = useProjectStore((state) => state.serverRunning);
  const [iframeLoaded, setIframeLoaded] = useState(false);

  // The message listener logic has been removed from this component.
  // It is now centralized in App.tsx to avoid redundancy and bugs.

  const handleIframeLoad = () => {
    console.log('[GuestViewport] Iframe loaded');
    setIframeLoaded(true);
  };

  const iframeUrl = serverRunning
    ? `http://localhost:${httpPort}` // The prototype should handle the default page
    : 'about:blank';

  return (
    <div className="w-full h-full bg-white relative">
      <iframe
        ref={iframeRef}
        src={iframeUrl}
        className="w-full h-full border-0"
        onLoad={handleIframeLoad}
        title="Guest Viewport"
        sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
      />

      {!iframeLoaded && serverRunning && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white z-10">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mb-4"></div>
          <p className="text-gray-600 font-medium">Loading guest prototype...</p>
        </div>
      )}

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
  );
}