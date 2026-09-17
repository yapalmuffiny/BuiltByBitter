import * as React from 'react'
import { Search, KeyRound, AlertCircle, Loader2, PackageOpen, MousePointerClick } from 'lucide-react'
import { useData } from '@/lib/data-context'
import { useUI } from '@/lib/ui-context'
import { ResourceCard } from '@/components/ResourceCard'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

function CenterState({
  icon,
  title,
  children
}: {
  icon: React.ReactNode
  title: string
  children?: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
        {icon}
      </div>
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-1.5 max-w-sm text-sm text-muted-foreground">{children}</div>
    </div>
  )
}

export function Resources(): React.JSX.Element {
  const { connection, resources, loading, error, refresh } = useData()
  const { setView } = useUI()
  const [query, setQuery] = React.useState('')

  const connected = Boolean(connection?.connected && (connection?.keyValid ?? true))

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return resources
    return resources.filter(
      (r) =>
        (r.title ?? '').toLowerCase().includes(q) ||
        (r.summary ?? '').toLowerCase().includes(q) ||
        String(r.resourceId).includes(q)
    )
  }, [resources, query])

  if (loading && resources.length === 0) {
    return (
      <CenterState icon={<Loader2 className="h-6 w-6 animate-spin" />} title="Loading resources…">
        Fetching your BuiltByBit catalog.
      </CenterState>
    )
  }

  if (!connected) {
    return (
      <CenterState icon={<KeyRound className="h-6 w-6" />} title="Connect your API key">
        Add your BuiltByBit Ultimate API key to load your resources and addons.
        <div className="mt-4">
          <Button onClick={() => setView('settings')}>
            <KeyRound className="h-4 w-4" />
            Open Settings
          </Button>
        </div>
      </CenterState>
    )
  }

  if (error) {
    return (
      <CenterState icon={<AlertCircle className="h-6 w-6 text-red-400" />} title="Couldn't load resources">
        {error}
        <div className="mt-4">
          <Button variant="outline" onClick={() => void refresh()}>
            Try again
          </Button>
        </div>
      </CenterState>
    )
  }

  return (
    <div className="px-6 py-5">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search resources…"
            className="pl-8"
          />
        </div>
        <div className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
          <MousePointerClick className="h-3.5 w-3.5" />
          Drag a file onto a resource to post an update
        </div>
      </div>

      {filtered.length === 0 ? (
        <CenterState icon={<PackageOpen className="h-6 w-6" />} title="No resources found">
          {query ? 'Try a different search.' : 'Your account has no resources yet.'}
        </CenterState>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {filtered.map((r) => (
            <ResourceCard key={r.resourceId} resource={r} />
          ))}
        </div>
      )}
    </div>
  )
}
