import * as React from 'react'
import { Package, History, Settings, CircleDot, CircleSlash, Users, Receipt } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUI, type View } from '@/lib/ui-context'
import { useData } from '@/lib/data-context'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

const NAV: { view: View; label: string; icon: React.ReactNode }[] = [
  { view: 'resources', label: 'Resources', icon: <Package className="h-4 w-4" /> },
  { view: 'members', label: 'Members', icon: <Users className="h-4 w-4" /> },
  { view: 'sales', label: 'Sales', icon: <Receipt className="h-4 w-4" /> },
  { view: 'history', label: 'History', icon: <History className="h-4 w-4" /> },
  { view: 'settings', label: 'Settings', icon: <Settings className="h-4 w-4" /> }
]

export function Sidebar(): React.JSX.Element {
  const { view, setView } = useUI()
  const { connection, resources } = useData()

  const member = connection?.member
  const connected = connection?.connected && connection?.keyValid

  return (
    <aside className="drag-region flex w-56 shrink-0 flex-col border-r border-border bg-card/40">
      <div className="h-11" />
      <div className="no-drag flex items-center gap-2.5 px-4 pb-4 pt-1">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <Package className="h-4.5 w-4.5" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold">BuiltByBitter</div>
          <div className="text-[11px] text-muted-foreground">Creator studio</div>
        </div>
      </div>

      <nav className="no-drag flex flex-col gap-1 px-3">
        {NAV.map((item) => (
          <button
            key={item.view}
            onClick={() => setView(item.view)}
            className={cn(
              'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              view === item.view
                ? 'bg-primary/15 text-primary'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            )}
          >
            {item.icon}
            {item.label}
            {item.view === 'resources' && resources.length > 0 ? (
              <span className="ml-auto text-[11px] text-muted-foreground">{resources.length}</span>
            ) : null}
          </button>
        ))}
      </nav>

      <div className="mt-auto p-3">
        <button
          onClick={() => setView('settings')}
          className="no-drag flex w-full items-center gap-2.5 rounded-lg border border-border bg-background/40 p-2.5 text-left transition-colors hover:bg-accent"
        >
          <Avatar className="h-8 w-8">
            {member?.avatarUrl ? <AvatarImage src={member.avatarUrl} /> : null}
            <AvatarFallback>{(member?.username ?? '?').slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate text-xs font-medium">{member?.username ?? 'Not connected'}</div>
            <div className="flex items-center gap-1 text-[11px]">
              {connected ? (
                <>
                  <CircleDot className="h-3 w-3 text-emerald-400" />
                  <span className="text-emerald-400">Connected</span>
                </>
              ) : (
                <>
                  <CircleSlash className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">No API key</span>
                </>
              )}
            </div>
          </div>
        </button>
      </div>
    </aside>
  )
}
