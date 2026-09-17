import * as React from 'react'
import { Upload, Puzzle } from 'lucide-react'
import type { BBBAddon, BBBResource } from '@shared/types'
import { cn, formatPrice } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useUI } from '@/lib/ui-context'

function isFileAddon(addon: BBBAddon): boolean {
  return (addon.type ?? '').trim().toLowerCase() === 'extra'
}

export function AddonCard({
  addon,
  resource
}: {
  addon: BBBAddon
  resource: BBBResource
}): React.JSX.Element {
  const { openComposer } = useUI()
  const [dropActive, setDropActive] = React.useState(false)
  const dragDepth = React.useRef(0)

  const updatable = isFileAddon(addon)

  const onDrop = (e: React.DragEvent): void => {
    e.preventDefault()
    dragDepth.current = 0
    setDropActive(false)
    if (!updatable) return
    const file = e.dataTransfer.files?.[0]
    if (file) {
      openComposer({
        kind: 'resource',
        resource,
        initialAddonFiles: { [addon.addonId]: file }
      })
    }
  }

  const disabled = addon.state === 'disabled'

  return (
    <div
      onDragEnter={(e) => {
        if (!updatable) return
        e.preventDefault()
        dragDepth.current += 1
        setDropActive(true)
      }}
      onDragOver={(e) => {
        if (updatable) e.preventDefault()
      }}
      onDragLeave={() => {
        if (!updatable) return
        dragDepth.current -= 1
        if (dragDepth.current <= 0) setDropActive(false)
      }}
      onDrop={onDrop}
      className={cn(
        'flex items-center gap-3 rounded-lg border border-border bg-background/40 p-3 transition-colors',
        dropActive && 'drop-active'
      )}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-secondary text-muted-foreground">
        <Puzzle className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{addon.title ?? `Addon #${addon.addonId}`}</span>
          {disabled ? (
            <Badge variant="secondary" className="shrink-0">
              Disabled
            </Badge>
          ) : null}
          {addon.default ? (
            <Badge variant="outline" className="shrink-0">
              Default
            </Badge>
          ) : null}
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
          {addon.type ? <span className="capitalize">{addon.type}</span> : null}
          <span>·</span>
          <span>{formatPrice(addon.finalPrice ?? addon.listPrice)}</span>
        </div>
      </div>
      {updatable ? (
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            openComposer({
              kind: 'resource',
              resource,
              addon
            })
          }
        >
          <Upload className="h-3.5 w-3.5" />
          Update
        </Button>
      ) : null}
    </div>
  )
}
