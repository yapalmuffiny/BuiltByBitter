import { contextBridge, ipcRenderer } from 'electron'
import type { AppRuntimeInfo } from '@shared/types'

const api = {
  getRuntimeInfo: (): Promise<AppRuntimeInfo> => ipcRenderer.invoke('app:getRuntimeInfo'),
  startOAuth: (provider: 'builtbybit' | 'discord'): Promise<{ token: string; user: unknown }> =>
    ipcRenderer.invoke('auth:startOAuth', provider),
  setTheme: (theme: 'dark' | 'light' | 'system'): Promise<void> =>
    ipcRenderer.invoke('window:setTheme', theme)
}

export type BridgeApi = typeof api

// Context isolation is always enabled for this app.
contextBridge.exposeInMainWorld('api', api)
