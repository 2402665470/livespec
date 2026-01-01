/**
 * useKeyboardShortcuts Hook
 *
 * Handles keyboard shortcuts for graph operations
 */

import { useEffect } from 'react'
import { useGraphOperations } from './use-graph-operations'
import { useUIStore } from '../stores/ui-store'

export function useKeyboardShortcuts() {
  const { deleteSelectedNodes } = useGraphOperations()
  const { resetView } = useUIStore()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Delete key for deleting selected nodes
      if (e.key === 'Delete' || e.key === 'Backspace') {
        // Don't delete if editing text
        const target = e.target as HTMLElement
        if (
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.contentEditable === 'true'
        ) {
          return
        }
        deleteSelectedNodes()
      }

      // Escape to clear selection
      if (e.key === 'Escape') {
        // TODO: Clear selection
      }

      // Reset view with Ctrl+0 / Cmd+0
      if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault()
        resetView()
      }

      // Zoom in/out with Ctrl +/-
      if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '-' || e.key === '=')) {
        e.preventDefault()
        const { zoom, setZoom } = useUIStore.getState()
        setZoom(e.key === '-' ? zoom * 0.9 : zoom * 1.1)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [deleteSelectedNodes, resetView])
}
