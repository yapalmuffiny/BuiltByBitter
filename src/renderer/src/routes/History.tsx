import * as React from 'react'
import { CheckCircle2, XCircle, FlaskConical, Loader2, Clock, FileText, Package, Puzzle } from 'lucide-react'
import type { UpdatePostRecord } from '@shared/types'
import { getHistory } from '@/lib/api'
import { formatBytes, formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

function StatusBadge({ record }: { record: UpdatePostRecord }): React.JSX.Element {
  if (record.status === 'success')
    return (
      <Badge variant="success">
        <CheckCircle2 className="h-3 w-3" /> Posted
      </Badge>
    )
  if (record.status === 'dry-run')
    return (
      <Badge variant="secondary">
        <FlaskConical className="h-3 w-3" /> Dry run
      </Badge>
    )
  return (
    <Badge variant="destructive">
      <XCircle className="h-3 w-3" /> Error
    </Badge>
  )
}

export function History(): React.JSX.Element {
  const [records, setRecords] = React.useState<UpdatePostRecord[] | null>(null)

  React.useEffect(() => {
    let active = true
    getHistory()
      .then((r) => active && setRecords(r))
      .catch(() => active && setRecords([]))
    return () => {
      active = false
    }
  }, [])

  if (records === null) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading history…
      </div>
    )
  }

  if (records.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
          <Clock className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-semibold">No updates yet</h2>
        <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
          Posts and dry runs you make will be logged here.
        </p>
      </div>
    )
  }

  return (
    <div className="px-6 py-5">
      <div className="flex flex-col gap-2">
        {records.map((r) => (
          <div
            key={r.id}
            className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-secondary text-muted-foreground">
              {r.kind === 'resource' ? <Package className="h-4 w-4" /> : <Puzzle className="h-4 w-4" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {r.kind === 'resource' ? 'Resource' : 'Addon'} #{r.targetId}
                </span>
                <span className="rounded bg-secondary px-1.5 py-0.5 text-xs">v{r.versionName}</span>
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                <FileText className="h-3 w-3" />
                <span className="truncate">{r.fileName}</span>
                <span>·</span>
                <span>{formatBytes(r.fileSize)}</span>
                <span>·</span>
                <span>{formatDate(r.postedAt)}</span>
              </div>
              {r.error ? <div className="mt-1 text-xs text-red-400">{r.error}</div> : null}
            </div>
            <StatusBadge record={r} />
          </div>
        ))}
      </div>
    </div>
  )
}
