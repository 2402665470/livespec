/**
 * useViewport Hook
 *
 * Manages canvas viewport (zoom and pan)
 */

import { useCallback, useEffect, useRef } from 'react'
import { useUIStore } from '../stores/ui-store'

export function useViewport(containerRef: React.RefObject<HTMLDivElement>) {
  const { zoom, pan, setZoom, setPan } = useUIStore()
  const isDraggingRef = useRef(false)
  const lastMouseRef = useRef({ x: 0, y: 0 })

  // Handle wheel zoom
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        // Zoom
        e.preventDefault()
        const delta = e.deltaY > 0 ? 0.9 : 1.1
        setZoom(zoom * delta)
      } else {
        // Pan
        e.preventDefault()
        setPan({
          x: pan.x - e.deltaX,
          y: pan.y - e.deltaY
        })
      }
    },
    [zoom, pan, setZoom, setPan]
  )

  // Handle mouse drag for panning
  const handleMouseDown = useCallback((e: MouseEvent) => {
    // Only pan with middle mouse or space+left mouse
    if (e.button === 1 || (e.button === 0 && e.getModifierState('Space'))) {
      isDraggingRef.current = true
      lastMouseRef.current = { x: e.clientX, y: e.clientY }
      e.preventDefault()
    }
  }, [])

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (isDraggingRef.current) {
        const dx = e.clientX - lastMouseRef.current.x
        const dy = e.clientY - lastMouseRef.current.y
        setPan({
          x: pan.x + dx,
          y: pan.y + dy
        })
        lastMouseRef.current = { x: e.clientX, y: e.clientY }
      }
    },
    [pan, setPan]
  )

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false
  }, [])

  // Register event listeners
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.addEventListener('wheel', handleWheel, { passive: false })
    window.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      container.removeEventListener('wheel', handleWheel)
      window.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [containerRef, handleWheel, handleMouseDown, handleMouseMove, handleMouseUp])

  return {
    zoom,
    pan,
    setZoom,
    setPan
  }
}
