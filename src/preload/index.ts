import { contextBridge, ipcRenderer } from 'electron'
import type { AppRuntimeInfo, OAuthConfigStatus } from '@shared/types'

const api = {
  getRuntimeInfo: (): Promise<AppRuntimeInfo> => ipcRenderer.invoke('app:getRuntimeInfo'),
  startOAuth: (provider: 'builtbybit' | 'discord'): Promise<{ token: string; user: unknown }> =>
    ipcRenderer.invoke('auth:startOAuth', provider),
  getOAuthConfig: (): Promise<OAuthConfigStatus> => ipcRenderer.invoke('oauth:getConfig'),
  setOAuthConfig: (clientId: string, clientSecret: string): Promise<AppRuntimeInfo> =>
    ipcRenderer.invoke('oauth:setConfig', clientId, clientSecret),
  clearOAuthConfig: (): Promise<AppRuntimeInfo> => ipcRenderer.invoke('oauth:clearConfig'),
  setTheme: (theme: 'dark' | 'light' | 'system'): Promise<void> =>
    ipcRenderer.invoke('window:setTheme', theme)
}

export type BridgeApi = typeof api

// Context isolation is always enabled for this app.
contextBridge.exposeInMainWorld('api', api)
