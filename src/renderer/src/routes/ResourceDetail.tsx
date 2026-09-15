import * as React from 'react'
import {
  Download,
  ShoppingCart,
  Star,
  Upload,
  ExternalLink,
  Puzzle,
  Tag,
  Megaphone,
  Loader2,
  MessageSquare
} from 'lucide-react'
import type { BBBReview, BBBUpdate, BBBVersionFull } from '@shared/types'
import { useUI } from '@/lib/ui-context'
import { useData } from '@/lib/data-context'
import { getReviews, getUpdates, getVersions } from '@/lib/api'
import { formatDate, formatNumber, formatPrice } from '@/lib/utils'
import { CoverImage } from '@/components/CoverImage'
import { AddonCard } from '@/components/AddonCard'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'

export function ResourceDetail(): React.JSX.Element | null {
  const { detailResource, closeDetail, openComposer } = useUI()
  const { addonsForResource } = useData()

  const [versions, setVersions] = React.useState<BBBVersionFull[] | null>(null)
  const [updates, setUpdates] = React.useState<BBBUpdate[] | null>(null)
  const [reviews, setReviews] = React.useState<BBBReview[] | null>(null)

  const resource = detailResource
  const resourceId = resource?.resourceId

  React.useEffect(() => {
    if (resourceId == null) return
    setVersions(null)
    setUpdates(null)
    setReviews(null)
    const ids = [resourceId]
    getVersions(ids).then(setVersions).catch(() => setVersions([]))
    getUpdates(ids).then(setUpdates).catch(() => setUpdates([]))
    getReviews(ids).then(setReviews).catch(() => setReviews([]))
  }, [resourceId])

  if (!resource) return null
  const addons = addonsForResource(resource.resourceId)

  const stats = [
    {
      icon: <ShoppingCart className="h-4 w-4 text-warm-pink" />,
      label: 'Purchases',
      value: formatNumber(resource.purchaseCount ?? resource.purchases)
    },
    {
      icon: <Download className="h-4 w-4 text-warm-orange" />,
      label: 'Downloads',
      value: formatNumber(resource.downloadCount ?? resource.downloads)
    },
    {
      icon: <Star className="h-4 w-4 text-warm-yellow" />,
      label: 'Rating',
      value: resource.reviewAverage
        ? `${resource.reviewAverage.toFixed(1)} (${formatNumber(resource.reviewCount)})`
        : '—'
    }
  ]

  return (
    <Dialog open onOpenChange={(o) => !o && closeDetail()}>
      <DialogContent className="max-w-3xl p-0">
        <div className="relative aspect-[3/1] w-full overflow-hidden rounded-t-xl">
          <CoverImage src={resource.coverImageUrl} rounded="rounded-none" className="h-full w-full" />
        </div>

        <div className="p-6 pt-2">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {resource.title ?? `Resource #${resource.resourceId}`}
            </DialogTitle>
            <DialogDescription>{resource.summary}</DialogDescription>
          </DialogHeader>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-secondary px-2.5 py-1 text-sm font-medium">
              {formatPrice(resource.finalPrice ?? resource.listPrice)}
            </span>
            {resource.latestVersion?.name ? (
              <span className="rounded-md bg-secondary px-2.5 py-1 text-sm">
                Latest: v{resource.latestVersion.name}
              </span>
            ) : null}
            <div className="ml-auto flex gap-2">
              {resource.url ? (
                <Button variant="outline" size="sm" onClick={() => window.open(resource.url, '_blank')}>
                  <ExternalLink className="h-3.5 w-3.5" />
                  View on BBB
                </Button>
              ) : null}
              <Button size="sm" onClick={() => openComposer({ kind: 'resource', resource })}>
                <Upload className="h-3.5 w-3.5" />
                Post update
              </Button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3">
            {stats.map((s) => (
              <div key={s.label} className="rounded-lg border border-border bg-background/40 p-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  {s.icon}
                  {s.label}
                </div>
                <div className="mt-1 text-lg font-semibold">{s.value}</div>
              </div>
            ))}
          </div>

          <Separator className="my-5" />

          <Tabs defaultValue="addons">
            <TabsList>
              <TabsTrigger value="addons">
                <Puzzle className="h-3.5 w-3.5" />
                Addons {addons.length ? <span className="opacity-70">{addons.length}</span> : null}
              </TabsTrigger>
              <TabsTrigger value="versions">
                <Tag className="h-3.5 w-3.5" />
                Versions
              </TabsTrigger>
              <TabsTrigger value="updates">
                <Megaphone className="h-3.5 w-3.5" />
                Updates
              </TabsTrigger>
              <TabsTrigger value="reviews">
                <Star className="h-3.5 w-3.5" />
                Reviews
              </TabsTrigger>
            </TabsList>

            {/* Addons */}
            <TabsContent value="addons">
              {addons.length === 0 ? (
                <Empty label="This resource has no addons." />
              ) : (
                <div className="flex flex-col gap-2">
                  {addons.map((a) => (
                    <AddonCard key={a.addonId} addon={a} resource={resource} />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Versions */}
            <TabsContent value="versions">
              {versions === null ? (
                <Loading />
              ) : versions.length === 0 ? (
                <Empty label="No versions found." />
              ) : (
                <div className="flex flex-col gap-2">
                  {versions.map((v) => (
                    <div
                      key={v.versionId}
                      className="flex items-center gap-3 rounded-lg border border-border bg-background/40 p-3"
                    >
                      <div className="flex h-8 items-center rounded-md bg-secondary px-2 text-xs font-medium">
                        {v.versionString ?? '—'}
                      </div>
                      <div className="min-w-0 flex-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-2">
                          <span className="flex items-center gap-1">
                            <Download className="h-3 w-3 text-warm-orange" />
                            {formatNumber(v.downloadCount)}
                          </span>
                          <span>·</span>
                          <span>{formatDate(v.createdAt)}</span>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Updates */}
            <TabsContent value="updates">
              {updates === null ? (
                <Loading />
              ) : updates.length === 0 ? (
                <Empty label="No updates posted." />
              ) : (
                <div className="flex flex-col gap-2">
                  {updates.map((u) => (
                    <div key={u.updateId} className="rounded-lg border border-border bg-background/40 p-3">
                      <div className="flex items-center gap-2">
                        <Megaphone className="h-3.5 w-3.5 text-warm-pink" />
                        <span className="text-sm font-medium">{u.title ?? 'Update'}</span>
                        <span className="ml-auto text-xs text-muted-foreground">
                          {formatDate(u.createdAt ?? u.postDate)}
                        </span>
                      </div>
                      {u.message ? (
                        <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">{u.message}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Reviews */}
            <TabsContent value="reviews">
              {reviews === null ? (
                <Loading />
              ) : reviews.length === 0 ? (
                <Empty label="No reviews yet." />
              ) : (
                <div className="flex flex-col gap-2">
                  {reviews.map((r, i) => (
                    <div
                      key={(r.reviewId as number) ?? i}
                      className="rounded-lg border border-border bg-background/40 p-3"
                    >
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, s) => (
                          <Star
                            key={s}
                            className={
                              s < (r.rating ?? 0)
                                ? 'h-3.5 w-3.5 fill-warm-yellow text-warm-yellow'
                                : 'h-3.5 w-3.5 text-muted-foreground/40'
                            }
                          />
                        ))}
                        <span className="ml-auto text-xs text-muted-foreground">
                          {formatDate(r.createdAt)}
                        </span>
                      </div>
                      {r.message ? (
                        <p className="mt-1.5 flex gap-1.5 text-xs text-muted-foreground">
                          <MessageSquare className="mt-0.5 h-3 w-3 shrink-0" />
                          {r.message}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Loading(): React.JSX.Element {
  return (
    <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" /> Loading…
    </div>
  )
}

function Empty({ label }: { label: string }): React.JSX.Element {
  return <div className="py-8 text-center text-sm text-muted-foreground">{label}</div>
}
