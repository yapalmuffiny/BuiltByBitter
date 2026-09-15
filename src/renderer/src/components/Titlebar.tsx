import * as React from 'react'
import { RefreshCw, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUI } from '@/lib/ui-context'
import { useData } from '@/lib/data-context'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'

const TITLES: Record<string, string> = {
  resources: 'Resources',
  members: 'Member lookup',
  sales: 'Sales & licenses',
  history: 'Update history',
  settings: 'Settings'
}

export function Titlebar(): React.JSX.Element {
  const { view } = useUI()
  const { refresh, loading } = useData()
  const { logout } = useAuth()
  const [spinning, setSpinning] = React.useState(false)

  const doRefresh = async (): Promise<void> => {
    setSpinning(true)
    await refresh()
    setTimeout(() => setSpinning(false), 400)
  }

  return (
    <header className="drag-region flex h-11 shrink-0 items-center justify-between border-b border-border px-5">
      <div className="text-sm font-semibold">{TITLES[view] ?? ''}</div>
      <div className="no-drag flex items-center gap-1.5">
        <Button variant="ghost" size="sm" onClick={doRefresh} disabled={loading}>
          <RefreshCw className={cn('h-3.5 w-3.5', (spinning || loading) && 'animate-spin')} />
          Refresh
        </Button>
        <Button variant="ghost" size="icon" onClick={() => void logout()} title="Sign out">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  )
}
