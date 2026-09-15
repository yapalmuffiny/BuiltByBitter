import * as React from 'react'
import { Sidebar } from './Sidebar'
import { Titlebar } from './Titlebar'
import { useUI } from '@/lib/ui-context'
import { Resources } from '@/routes/Resources'
import { Members } from '@/routes/Members'
import { Sales } from '@/routes/Sales'
import { History } from '@/routes/History'
import { Settings } from '@/routes/Settings'
import { ResourceDetail } from '@/routes/ResourceDetail'
import { UpdateComposer } from './UpdateComposer'

export function AppShell(): React.JSX.Element {
  const { view } = useUI()

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Titlebar />
        <main className="flex-1 overflow-y-auto">
          {view === 'resources' ? <Resources /> : null}
          {view === 'members' ? <Members /> : null}
          {view === 'sales' ? <Sales /> : null}
          {view === 'history' ? <History /> : null}
          {view === 'settings' ? <Settings /> : null}
        </main>
      </div>
      <ResourceDetail />
      <UpdateComposer />
    </div>
  )
}
