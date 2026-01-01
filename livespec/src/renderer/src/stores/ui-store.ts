/**
 * UI Store
 *
 * Manages UI state (theme, layout, viewport)
 */

import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { UIStoreState } from '../../../shared/types'

interface UIState extends UIStoreState {
  // Internal state
  _theme: 'light' | 'dark'
  _sidebarVisible: boolean
  _viewMode: 'tree' | 'graph'
  _zoom: number
  _pan: { x: number; y: number }
}

export const useUIStore = create<UIState>()(
  immer((set) => ({
    // Initial state
    _theme: 'dark',
    _sidebarVisible: true,
    _viewMode: 'graph',
    _zoom: 1,
    _pan: { x: 0, y: 0 },

    // Getters
    get theme(): 'light' | 'dark' {
      return this._theme
    },
    get sidebarVisible() {
      return this._sidebarVisible
    },
    get viewMode(): 'tree' | 'graph' {
      return this._viewMode
    },
    get zoom() {
      return this._zoom
    },
    get pan() {
      return this._pan
    },

    // Actions
    setTheme: (theme: 'light' | 'dark') =>
      set((state) => {
        state._theme = theme
      }),

    toggleSidebar: () =>
      set((state) => {
        state._sidebarVisible = !state._sidebarVisible
      }),

    setViewMode: (mode: 'tree' | 'graph') =>
      set((state) => {
        state._viewMode = mode
      }),

    setZoom: (zoom: number) =>
      set((state) => {
        state._zoom = Math.max(0.1, Math.min(5, zoom)) // Clamp between 0.1 and 5
      }),

    setPan: (pan: { x: number; y: number }) =>
      set((state) => {
        state._pan = pan
      }),

    resetView: () =>
      set((state) => {
        state._zoom = 1
        state._pan = { x: 0, y: 0 }
      })
  }))
)
