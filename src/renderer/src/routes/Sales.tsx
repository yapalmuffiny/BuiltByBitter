import * as React from 'react'
import { Loader2, Receipt, KeyRound, ShoppingCart, Package } from 'lucide-react'
import type { BBBLicense, BBBPurchase } from '@shared/types'
import { getLicenses, getPurchases } from '@/lib/api'
import { useData } from '@/lib/data-context'
import { formatDate, formatPrice } from '@/lib/utils'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'

function num(v: unknown): number | undefined {
  return typeof v === 'number' ? v : undefined
}

/**
 * Read the first numeric value among the given (camelCased) keys. The numeric
 * guard means a differently-typed field (e.g. a boolean) is skipped rather than
 * rendered as a bogus value.
 */
function firstNum(obj: Record<string, unknown>, keys: string[]): number | undefined {
  for (const k of keys) {
    const v = num(obj[k])
    if (v != null) return v
  }
  return undefined
}

/** Pull a non-empty string property off a nested object (e.g. resource.title). */
function nestedStr(v: unknown, key: string): string | undefined {
  if (v && typeof v === 'object') {
    const s = (v as Record<string, unknown>)[key]
    if (typeof s === 'string' && s.trim()) return s
  }
  return undefined
}

// Field names per BuiltByBit's OpenAPI Purchase/License models: the resource is
// identified by `content_id` (contentType says whether it's a resource/addon),
// the buyer by `buyer_id`, and rows may embed nested `resource`/`buyer` objects.
const RESOURCE_ID_KEYS = ['contentId', 'resourceId']
const BUYER_ID_KEYS = ['buyerId', 'purchaserId']
const PURCHASE_DATE_KEYS = ['createdAt', 'validatedAt']
const START_KEYS = ['startDate']
const END_KEYS = ['endDate']

export function Sales(): React.JSX.Element {
  const { resources, connection } = useData()
  const [purchases, setPurchases] = React.useState<BBBPurchase[] | null>(null)
  const [licenses, setLicenses] = React.useState<BBBLicense[] | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  const connected = connection?.connected && connection?.keyValid

  const titleFor = React.useCallback(
    (resourceId?: number): string => {
      const r = resources.find((x) => x.resourceId === resourceId)
      return r?.title ?? (resourceId != null ? `Resource #${resourceId}` : 'Resource')
    },
    [resources]
  )

  React.useEffect(() => {
    if (!connected) return
    let active = true
    Promise.all([getPurchases(), getLicenses()])
      .then(([p, l]) => {
        if (!active) return
        setPurchases(p)
        setLicenses(l)
      })
      .catch((e) => active && setError(e instanceof Error ? e.message : 'Failed to load'))
    return () => {
      active = false
    }
  }, [connected])

  if (!connected) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
          <KeyRound className="h-6 w-6" />
        </div>
        <p className="text-sm text-muted-foreground">Connect your API key to view sales & licenses.</p>
      </div>
    )
  }

  return (
    <div className="px-6 py-5">
      <Tabs defaultValue="purchases">
        <TabsList>
          <TabsTrigger value="purchases">
            <ShoppingCart className="h-3.5 w-3.5" />
            Purchases
            {purchases ? <span className="ml-1 text-xs opacity-70">{purchases.length}</span> : null}
          </TabsTrigger>
          <TabsTrigger value="licenses">
            <Receipt className="h-3.5 w-3.5" />
            Licenses
            {licenses ? <span className="ml-1 text-xs opacity-70">{licenses.length}</span> : null}
          </TabsTrigger>
        </TabsList>

        {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}

        <TabsContent value="purchases">
          {purchases === null ? (
            <Loading />
          ) : purchases.length === 0 ? (
            <Empty label="No purchases yet." />
          ) : (
            <div className="flex flex-col gap-2">
              {purchases.map((p, i) => {
                const price = (p.price ?? p.finalPrice) as
                  | { formatted?: string; value?: number; currency?: string }
                  | undefined
                const buyerName = nestedStr(p.buyer, 'username')
                const buyerId = firstNum(p, BUYER_ID_KEYS)
                const when = firstNum(p, PURCHASE_DATE_KEYS)
                const title =
                  nestedStr(p.resource, 'title') ??
                  nestedStr(p.addon, 'title') ??
                  titleFor(firstNum(p, RESOURCE_ID_KEYS))
                return (
                  <Row
                    key={firstNum(p, ['purchaseId', 'id']) ?? i}
                    title={title}
                    subtitle={`${buyerName ? `@${buyerName}` : `Buyer #${buyerId ?? '—'}`}${
                      when ? ` · ${formatDate(when)}` : ''
                    }`}
                    right={
                      <span className="text-sm font-medium">{price ? formatPrice(price) : '—'}</span>
                    }
                  />
                )
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="licenses">
          {licenses === null ? (
            <Loading />
          ) : licenses.length === 0 ? (
            <Empty label="No licenses yet." />
          ) : (
            <div className="flex flex-col gap-2">
              {licenses.map((l, i) => {
                const end = firstNum(l, END_KEYS)
                const start = firstNum(l, START_KEYS)
                const holderName = nestedStr(l.buyer, 'username')
                const holderId = firstNum(l, BUYER_ID_KEYS)
                const activeBool = typeof l.active === 'boolean' ? l.active : undefined
                // Per the model, `active` is authoritative only for permanent
                // licenses; temporary ones are active while endDate is in the future.
                const active =
                  l.permanent === true
                    ? activeBool
                    : end != null
                      ? (end < 1e12 ? end * 1000 : end) > Date.now()
                      : activeBool
                const title =
                  nestedStr(l.resource, 'title') ?? titleFor(firstNum(l, RESOURCE_ID_KEYS))
                return (
                  <Row
                    key={firstNum(l, ['licenseId', 'id']) ?? i}
                    title={title}
                    subtitle={`${holderName ? `@${holderName}` : `Holder #${holderId ?? '—'}`}${
                      start ? ` · from ${formatDate(start)}` : ''
                    }`}
                    right={
                      active === undefined ? null : active ? (
                        <Badge variant="success">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Expired</Badge>
                      )
                    }
                  />
                )
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function Row({
  title,
  subtitle,
  right
}: {
  title: string
  subtitle: string
  right: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-secondary text-muted-foreground">
        <Package className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{title}</div>
        <div className="truncate text-xs text-muted-foreground">{subtitle}</div>
      </div>
      {right}
    </div>
  )
}

function Loading(): React.JSX.Element {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" /> Loading…
    </div>
  )
}

function Empty({ label }: { label: string }): React.JSX.Element {
  return <div className="py-16 text-center text-sm text-muted-foreground">{label}</div>
}
