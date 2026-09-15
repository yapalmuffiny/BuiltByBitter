import * as React from 'react'
import type { BBBAddon, BBBConnection, BBBResource } from '@shared/types'
import { connectKey, disconnectKey, getAddons, getResources, getStatus } from './api'

interface DataState {
  connection: BBBConnection | null
  resources: BBBResource[]
  addons: BBBAddon[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  connect: (apiKey: string) => Promise<void>
  disconnect: () => Promise<void>
  addonsForResource: (resourceId: number) => BBBAddon[]
}

const DataContext = React.createContext<DataState | null>(null)

export function useData(): DataState {
  const ctx = React.useContext(DataContext)
  if (!ctx) throw new Error('useData outside provider')
  return ctx
}

export function DataProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [connection, setConnection] = React.useState<BBBConnection | null>(null)
  const [resources, setResources] = React.useState<BBBResource[]>([])
  const [addons, setAddons] = React.useState<BBBAddon[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const refresh = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const status = await getStatus()
      setConnection(status)
      if (status.connected) {
        const [res, add] = await Promise.all([getResources(), getAddons()])
        setResources(res)
        setAddons(add)
      } else {
        setResources([])
        setAddons([])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void refresh()
  }, [refresh])

  const connect = React.useCallback(
    async (apiKey: string) => {
      await connectKey(apiKey)
      await refresh()
    },
    [refresh]
  )

  const disconnect = React.useCallback(async () => {
    await disconnectKey()
    await refresh()
  }, [refresh])

  const addonsForResource = React.useCallback(
    (resourceId: number) => addons.filter((a) => a.resourceId === resourceId),
    [addons]
  )

  const value: DataState = {
    connection,
    resources,
    addons,
    loading,
    error,
    refresh,
    connect,
    disconnect,
    addonsForResource
  }
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}
