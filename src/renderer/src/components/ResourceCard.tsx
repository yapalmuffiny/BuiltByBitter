import * as React from 'react'
import { Download, ShoppingCart, Star, Puzzle, Upload, Tag } from 'lucide-react'
import type { BBBResource } from '@shared/types'
import { cn, formatNumber, formatPrice } from '@/lib/utils'
import { CoverImage } from './CoverImage'
import { Button } from '@/components/ui/button'
import { useUI } from '@/lib/ui-context'
import { useData } from '@/lib/data-context'

export function ResourceCard({ resource }: { resource: BBBResource }): React.JSX.Element {
  const { openComposer, openDetail } = useUI()
  const { addonsForResource } = useData()
  const [dropActive, setDropActive] = React.useState(false)
  const dragDepth = React.useRef(0)

  const addonCount = addonsForResource(resource.resourceId).length

  const onDrop = (e: React.DragEvent): void => {
    e.preventDefault()
    dragDepth.current = 0
    setDropActive(false)
    const file = e.dataTransfer.files?.[0]
    if (file) openComposer({ kind: 'resource', resource, file })
  }

  return (
    <div
      onDragEnter={(e) => {
        e.preventDefault()
        dragDepth.current += 1
        setDropActive(true)
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={() => {
        dragDepth.current -= 1
        if (dragDepth.current <= 0) setDropActive(false)
      }}
      onDrop={onDrop}
      className={cn(
        'group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-border/80',
        dropActive && 'drop-active'
      )}
    >
      <button
        onClick={() => openDetail(resource)}
        className="relative block aspect-[2/1] w-full text-left"
      >
        <CoverImage src={resource.coverImageUrl} alt={resource.title} rounded="rounded-none" className="h-full w-full" />
        <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 p-3">
          <div className="rounded-md bg-black/60 px-2 py-0.5 text-xs font-medium text-white backdrop-blur">
            {formatPrice(resource.finalPrice ?? resource.listPrice)}
          </div>
          {resource.latestVersion?.name ? (
            <div className="flex items-center gap-1 rounded-md bg-black/60 px-2 py-0.5 text-xs text-white backdrop-blur">
              <Tag className="h-3 w-3" />v{resource.latestVersion.name}
            </div>
          ) : null}
        </div>
        {dropActive ? (
          <div className="absolute inset-0 flex items-center justify-center bg-warm-orange/25 text-sm font-medium text-white">
            <Upload className="mr-2 h-4 w-4" /> Drop to post an update
          </div>
        ) : null}
      </button>

      <div className="flex flex-1 flex-col p-4">
        <button onClick={() => openDetail(resource)} className="text-left">
          <h3 className="line-clamp-1 font-semibold leading-tight hover:text-primary">
            {resource.title ?? `Resource #${resource.resourceId}`}
          </h3>
        </button>
        <p className="mt-1 line-clamp-2 min-h-[2.2rem] text-xs text-muted-foreground">
          {resource.summary ?? ''}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <ShoppingCart className="h-3.5 w-3.5 text-warm-pink" />
            {formatNumber(resource.purchaseCount ?? resource.purchases)}
          </span>
          <span className="flex items-center gap-1">
            <Download className="h-3.5 w-3.5 text-warm-orange" />
            {formatNumber(resource.downloadCount ?? resource.downloads)}
          </span>
          <span className="flex items-center gap-1">
            <Star className="h-3.5 w-3.5 text-warm-yellow" />
            {resource.reviewAverage ? resource.reviewAverage.toFixed(1) : '—'}
            <span className="opacity-60">({formatNumber(resource.reviewCount)})</span>
          </span>
          {addonCount > 0 ? (
            <span className="flex items-center gap-1">
              <Puzzle className="h-3.5 w-3.5 text-warm-pink" />
              {addonCount}
            </span>
          ) : null}
        </div>

        <div className="mt-4 flex items-center gap-2">
          <Button
            size="sm"
            className="flex-1"
            onClick={() => openComposer({ kind: 'resource', resource })}
          >
            <Upload className="h-3.5 w-3.5" />
            Post update
          </Button>
          <Button size="sm" variant="outline" onClick={() => openDetail(resource)}>
            Details
          </Button>
        </div>
      </div>
    </div>
  )
}
