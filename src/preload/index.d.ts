import type { BridgeApi } from './index'

declare global {
  interface Window {
    api: BridgeApi
  }
}

export {}
