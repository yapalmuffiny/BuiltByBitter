import * as React from 'react'
import {
  Search,
  Loader2,
  User,
  Hash,
  AtSign,
  Copy,
  Check,
  ExternalLink,
  Crown,
  ShieldAlert,
  CalendarDays,
  UserCircle2,
  Users
} from 'lucide-react'
import type { BBBMemberFull, MemberLookupType } from '@shared/types'
import { lookupMember } from '@/lib/api'
import { cn, formatDate, formatNumber } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useToast } from '@/components/ui/toast'

const TYPES: { type: MemberLookupType; label: string; icon: React.ReactNode; placeholder: string }[] =
  [
    { type: 'username', label: 'Username', icon: <AtSign className="h-3.5 w-3.5" />, placeholder: 'Muffiny' },
    { type: 'id', label: 'BBB ID', icon: <Hash className="h-3.5 w-3.5" />, placeholder: '321588' },
    {
      type: 'discord',
      label: 'Discord ID',
      icon: <User className="h-3.5 w-3.5" />,
      placeholder: '764868946523324457'
    }
  ]

function CopyButton({ value }: { value: string }): React.JSX.Element {
  const [copied, setCopied] = React.useState(false)
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(value).catch(() => {})
        setCopied(true)
        setTimeout(() => setCopied(false), 1200)
      }}
      className="text-muted-foreground transition-colors hover:text-foreground"
      title="Copy"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  )
}

function Field({
  label,
  value,
  mono,
  copy
}: {
  label: string
  value: React.ReactNode
  mono?: boolean
  copy?: string
}): React.JSX.Element {
  return (
    <div className="rounded-lg border border-border bg-background/40 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-0.5 flex items-center gap-2">
        <span className={cn('truncate text-sm font-medium', mono && 'font-mono')}>{value}</span>
        {copy ? <CopyButton value={copy} /> : null}
      </div>
    </div>
  )
}

function MemberCard({ member }: { member: BBBMemberFull }): React.JSX.Element {
  const badges: { label: string; variant: 'default' | 'success' | 'warning' | 'destructive' }[] = []
  if (member.ultimate) badges.push({ label: 'Ultimate', variant: 'default' })
  if (member.supreme) badges.push({ label: 'Supreme', variant: 'default' })
  if (member.premium) badges.push({ label: 'Premium', variant: 'success' })
  if (member.banned) badges.push({ label: 'Banned', variant: 'destructive' })
  if (member.suspended) badges.push({ label: 'Suspended', variant: 'warning' })
  if (member.restricted) badges.push({ label: 'Restricted', variant: 'warning' })
  if (member.disabled) badges.push({ label: 'Disabled', variant: 'warning' })

  const profileUrl =
    member.memberId != null
      ? `https://builtbybit.com/members/${member.memberId}/`
      : undefined

  return (
    <div className="animate-fade-in rounded-xl border border-border bg-card p-5">
      <div className="flex items-start gap-4">
        <Avatar className="h-16 w-16 rounded-xl">
          {member.avatarUrl ? <AvatarImage src={member.avatarUrl} /> : null}
          <AvatarFallback className="rounded-xl text-lg">
            {(member.username ?? '?').slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold">{member.username ?? 'Unknown'}</h2>
            {member.ultimate ? <Crown className="h-4 w-4 text-warm-yellow" /> : null}
          </div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {badges.length ? (
              badges.map((b) => (
                <Badge key={b.label} variant={b.variant}>
                  {b.label === 'Banned' ? <ShieldAlert className="h-3 w-3" /> : null}
                  {b.label}
                </Badge>
              ))
            ) : (
              <Badge variant="secondary">Member</Badge>
            )}
          </div>
        </div>
        {profileUrl ? (
          <Button variant="outline" size="sm" onClick={() => window.open(profileUrl, '_blank')}>
            <ExternalLink className="h-3.5 w-3.5" />
            Profile
          </Button>
        ) : null}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Field label="BBB ID" value={member.memberId ?? '—'} mono copy={String(member.memberId ?? '')} />
        <Field
          label="Discord ID"
          value={member.discordId ? String(member.discordId) : '—'}
          mono
          copy={member.discordId ? String(member.discordId) : undefined}
        />
        <Field
          label="Joined"
          value={
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
              {formatDate(member.joinDate)}
            </span>
          }
        />
        <Field label="Resources" value={formatNumber(member.resourceCount)} />
        <Field label="Purchases" value={formatNumber(member.purchaseCount)} />
        <Field label="Posts" value={formatNumber(member.postCount)} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-4 rounded-lg border border-border bg-background/40 p-3 text-sm">
        <span className="text-xs text-muted-foreground">Feedback</span>
        <span className="flex items-center gap-1 text-emerald-400">+{formatNumber(member.feedbackPositive)}</span>
        <span className="flex items-center gap-1 text-muted-foreground">
          ~{formatNumber(member.feedbackNeutral)}
        </span>
        <span className="flex items-center gap-1 text-red-400">−{formatNumber(member.feedbackNegative)}</span>
        {member.lastActivityDate ? (
          <span className="ml-auto text-xs text-muted-foreground">
            Last seen {formatDate(member.lastActivityDate)}
          </span>
        ) : null}
      </div>
    </div>
  )
}

export function Members(): React.JSX.Element {
  const { toast } = useToast()
  const [type, setType] = React.useState<MemberLookupType>('username')
  const [query, setQuery] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [member, setMember] = React.useState<BBBMemberFull | null>(null)

  const run = async (t: MemberLookupType, q?: string): Promise<void> => {
    if (t !== 'self' && !(q ?? '').trim()) return
    setLoading(true)
    try {
      const m = await lookupMember(t, q)
      setMember(m)
    } catch (err) {
      setMember(null)
      toast({
        variant: 'error',
        title: 'Member not found',
        description: err instanceof Error ? err.message : 'Lookup failed'
      })
    } finally {
      setLoading(false)
    }
  }

  const activePlaceholder = TYPES.find((t) => t.type === type)?.placeholder

  return (
    <div className="mx-auto max-w-2xl px-6 py-6">
      <div className="mb-4 flex rounded-lg border border-border p-0.5">
        {TYPES.map((t) => (
          <button
            key={t.type}
            onClick={() => setType(t.type)}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              type === t.type ? 'bg-secondary text-foreground' : 'text-muted-foreground'
            )}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          void run(type, query)
        }}
        className="flex gap-2"
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={activePlaceholder}
            className="pl-8"
          />
        </div>
        <Button type="submit" disabled={loading || !query.trim()}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Look up
        </Button>
        <Button type="button" variant="outline" onClick={() => void run('self')} disabled={loading}>
          <UserCircle2 className="h-4 w-4" />
          Me
        </Button>
      </form>

      <div className="mt-5">
        {loading && !member ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Looking up…
          </div>
        ) : member ? (
          <MemberCard member={member} />
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
              <Users className="h-6 w-6" />
            </div>
            <div className="text-sm text-muted-foreground">
              Look up any BuiltByBit member by username, ID, or Discord ID.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
