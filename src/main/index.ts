import './load-env' // MUST be first: populates process.env before ./server -> ../db
import { app, shell, BrowserWindow, ipcMain, nativeTheme } from 'electron'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { startServer, type RunningServer } from './server'
import {
  getOAuthCreds,
  setOAuthCreds,
  clearOAuthCreds
} from './server/keystore'
import type { AppRuntimeInfo, OAuthConfigStatus } from '@shared/types'

let mainWindow: BrowserWindow | null = null
let server: RunningServer | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 820,
    minWidth: 940,
    minHeight: 640,
    show: false,
    backgroundColor: '#0b0d10',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 18, y: 22 },
    vibrancy: 'under-window',
    visualEffectState: 'active',
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => mainWindow?.show())

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (!app.isPackaged && process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// Stop the local auth server (if running) and start a fresh one. Used after the
// BBB OAuth credentials change so better-auth rebuilds its provider config.
async function restartServer(): Promise<AppRuntimeInfo> {
  await server?.stop()
  server = await startServer()
  return runtimeInfo()
}

function oauthConfigStatus(): OAuthConfigStatus {
  const stored = getOAuthCreds()
  if (stored) return { configured: true, clientId: stored.clientId, source: 'keystore' }
  const envId = process.env.BBB_OAUTH_CLIENT_ID?.trim()
  const envSecret = process.env.BBB_OAUTH_CLIENT_SECRET?.trim()
  if (envId && envSecret && !envId.includes('xxxx')) {
    return { configured: true, clientId: envId, source: 'env' }
  }
  return { configured: false, clientId: null, source: null }
}

function runtimeInfo(): AppRuntimeInfo {
  return {
    serverUrl: server?.url ?? `http://localhost:${process.env.AUTH_PORT ?? 8788}`,
    authPort: server?.port ?? Number(process.env.AUTH_PORT ?? 8788),
    bbbOAuthConfigured: server?.flags.bbbConfigured ?? false,
    discordConfigured: server?.flags.discordConfigured ?? false,
    platform: process.platform,
    version: app.getVersion()
  }
}

// Run OAuth in the user's default system browser (so it reuses their existing
// BuiltByBit login/cookies), then poll the local server's one-time relay for the
// captured session token.
function runOAuth(provider: 'builtbybit' | 'discord'): Promise<{ token: string; user: unknown }> {
  return new Promise((resolve, reject) => {
    const serverUrl = server?.url
    if (!serverUrl) return reject(new Error('Local server not running'))

    const linkId = randomUUID()
    void shell.openExternal(`${serverUrl}/oauth-start?provider=${provider}&linkId=${linkId}`)

    const deadline = Date.now() + 3 * 60 * 1000 // 3 minutes
    const poll = async (): Promise<void> => {
      if (Date.now() > deadline) {
        reject(new Error('Sign-in timed out. Please try again.'))
        return
      }
      try {
        const res = await fetch(`${serverUrl}/oauth-token?linkId=${linkId}`)
        const data = (await res.json()) as {
          token?: string | null
          user?: unknown
          pending?: boolean
        }
        if (data.token) {
          resolve({ token: data.token, user: data.user })
          return
        }
      } catch {
        /* server momentarily unavailable; keep polling */
      }
      setTimeout(() => void poll(), 1200)
    }
    setTimeout(() => void poll(), 1500)
  })
}

function registerIpc(): void {
  ipcMain.handle('app:getRuntimeInfo', () => runtimeInfo())

  ipcMain.handle('auth:startOAuth', async (_e, provider: 'builtbybit' | 'discord') => {
    return runOAuth(provider)
  })

  // ── BBB OAuth application credentials (user-supplied) ──────────────────────
  ipcMain.handle('oauth:getConfig', (): OAuthConfigStatus => oauthConfigStatus())

  ipcMain.handle(
    'oauth:setConfig',
    async (_e, clientId: string, clientSecret: string): Promise<AppRuntimeInfo> => {
      setOAuthCreds(clientId, clientSecret) // throws on empty / no keychain
      return restartServer()
    }
  )

  ipcMain.handle('oauth:clearConfig', async (): Promise<AppRuntimeInfo> => {
    clearOAuthCreds()
    return restartServer()
  })

  ipcMain.handle('window:setTheme', (_e, theme: 'dark' | 'light' | 'system') => {
    nativeTheme.themeSource = theme
  })
}

app.whenReady().then(async () => {
  nativeTheme.themeSource = 'dark'
  app.setName('BuiltByBitter')

  try {
    server = await startServer()
  } catch (err) {
    console.error('Failed to start local server:', err)
  }

  registerIpc()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', async () => {
  if (process.platform !== 'darwin') {
    await server?.stop()
    app.quit()
  }
})

app.on('before-quit', async () => {
  await server?.stop()
})
