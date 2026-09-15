import * as React from 'react'
import type { AppRuntimeInfo, SessionUser } from '@shared/types'
import { getRuntime, getSessionUser, primeRuntime, setToken, signOut } from './api'

interface AuthState {
  user: SessionUser | null
  runtime: AppRuntimeInfo | null
  loading: boolean
  signingIn: boolean
  loginWith: (provider: 'builtbybit' | 'discord') => Promise<void>
  logout: () => Promise<void>
  configureOAuth: (clientId: string, clientSecret: string) => Promise<void>
  clearOAuthConfig: () => Promise<void>
}

const AuthContext = React.createContext<AuthState | null>(null)

export function useAuth(): AuthState {
  const ctx = React.useContext(AuthContext)
  if (!ctx) throw new Error('useAuth outside provider')
  return ctx
}

export function AuthProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [user, setUser] = React.useState<SessionUser | null>(null)
  const [runtime, setRuntime] = React.useState<AppRuntimeInfo | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [signingIn, setSigningIn] = React.useState(false)

  React.useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const rt = await getRuntime()
        if (active) setRuntime(rt)
        const u = await getSessionUser()
        if (active) setUser(u)
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [])

  const loginWith = React.useCallback(async (provider: 'builtbybit' | 'discord') => {
    setSigningIn(true)
    try {
      const { token } = await window.api.startOAuth(provider)
      if (!token) throw new Error('No session token returned')
      setToken(token)
      const u = await getSessionUser()
      setUser(u)
    } finally {
      setSigningIn(false)
    }
  }, [])

  const logout = React.useCallback(async () => {
    await signOut()
    setUser(null)
  }, [])

  const configureOAuth = React.useCallback(async (clientId: string, clientSecret: string) => {
    const rt = await window.api.setOAuthConfig(clientId, clientSecret)
    primeRuntime(rt)
    setRuntime(rt)
  }, [])

  const clearOAuthConfig = React.useCallback(async () => {
    const rt = await window.api.clearOAuthConfig()
    primeRuntime(rt)
    setRuntime(rt)
  }, [])

  const value: AuthState = {
    user,
    runtime,
    loading,
    signingIn,
    loginWith,
    logout,
    configureOAuth,
    clearOAuthConfig
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
