import { ElectronAPI } from '@electron-toolkit/preload'
import type { ElectronAPI as LiveSpecAPI } from '../shared/types'

declare global {
  interface Window {
    electron: ElectronAPI
    api: LiveSpecAPI
  }
}
