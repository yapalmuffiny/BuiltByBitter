import * as React from 'react'
import type { BBBAddon, BBBResource } from '@shared/types'

export type View = 'resources' | 'members' | 'sales' | 'history' | 'settings'

export interface ComposerTarget {
  kind: 'resource' | 'addon'
  resource: BBBResource
  addon?: BBBAddon
  file?: File
  initialAddonFiles?: Record<number, File>
}

interface UIState {
  view: View
  setView: (v: View) => void
  detailResource: BBBResource | null
  openDetail: (r: BBBResource) => void
  closeDetail: () => void
  composer: ComposerTarget | null
  openComposer: (t: ComposerTarget) => void
  closeComposer: () => void
}

const UIContext = React.createContext<UIState | null>(null)

export function useUI(): UIState {
  const ctx = React.useContext(UIContext)
  if (!ctx) throw new Error('useUI outside provider')
  return ctx
}

export function UIProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [view, setView] = React.useState<View>('resources')
  const [detailResource, setDetailResource] = React.useState<BBBResource | null>(null)
  const [composer, setComposer] = React.useState<ComposerTarget | null>(null)

  const value: UIState = {
    view,
    setView,
    detailResource,
    openDetail: setDetailResource,
    closeDetail: () => setDetailResource(null),
    composer,
    openComposer: setComposer,
    closeComposer: () => setComposer(null)
  }
  return <UIContext.Provider value={value}>{children}</UIContext.Provider>
}
