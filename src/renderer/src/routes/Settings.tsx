import * as React from 'react'
import {
  KeyRound,
  Loader2,
  LogOut,
  CheckCircle2,
  Link2Off,
  ShieldCheck,
  ExternalLink,
  Server,
  Fingerprint,
  Copy,
  Check
} from 'lucide-react'
import type { OAuthConfigStatus } from '@shared/types'
import { useAuth } from '@/lib/auth-context'
import { useData } from '@/lib/data-context'
import { useToast } from '@/components/ui/toast'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'

export function Settings(): React.JSX.Element {
  const { user, runtime, logout, configureOAuth, clearOAuthConfig } = useAuth()
  const { connection, connect, disconnect } = useData()
  const { toast } = useToast()
  const [apiKey, setApiKey] = React.useState('')
  const [connecting, setConnecting] = React.useState(false)

  const connected = Boolean(connection?.connected && (connection?.keyValid ?? true))
  const member = connection?.member

  const doConnect = async (): Promise<void> => {
    if (!apiKey.trim()) return
    setConnecting(true)
    try {
      await connect(apiKey.trim())
      setApiKey('')
      toast({ variant: 'success', title: 'Connected', description: 'Your API key is valid.' })
    } catch (err) {
      toast({
        variant: 'error',
        title: 'Connection failed',
        description: err instanceof Error ? err.message : 'Invalid API key'
      })
    } finally {
      setConnecting(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-6">
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="h-4 w-4" /> BuiltByBit connection
          </CardTitle>
          <CardDescription>
            Your Ultimate API key powers every resource and update action. It's stored encrypted in
            the macOS Keychain and never leaves your machine.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {connected ? (
            <div className="flex items-center gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
              <Avatar className="h-10 w-10">
                {member?.avatarUrl ? <AvatarImage src={member.avatarUrl} /> : null}
                <AvatarFallback>{(member?.username ?? '?').slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{member?.username ?? 'Connected'}</span>
                  <Badge variant="success">
                    <CheckCircle2 className="h-3 w-3" /> Valid
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  Connected {formatDate(connection?.connectedAt)}
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => void disconnect()}>
                <Link2Off className="h-3.5 w-3.5" />
                Disconnect
              </Button>
            </div>
          ) : null}

          <div>
            <Label htmlFor="apikey">{connected ? 'Replace API key' : 'Ultimate API key'}</Label>
            <div className="mt-1.5 flex gap-2">
              <Input
                id="apikey"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && void doConnect()}
                placeholder="Paste your BuiltByBit API key…"
                autoComplete="off"
              />
              <Button onClick={() => void doConnect()} disabled={!apiKey.trim() || connecting}>
                {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                Connect
              </Button>
            </div>
            <button
              onClick={() => window.open('https://builtbybit.com/account/api', '_blank')}
              className="mt-2 flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <ExternalLink className="h-3 w-3" />
              Where do I find my API key?
            </button>
          </div>
        </CardContent>
      </Card>

      <OAuthCard />

      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4" /> Account
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            {user?.image ? <AvatarImage src={user.image} /> : null}
            <AvatarFallback>{(user?.name ?? '?').slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium">{user?.name}</div>
            <div className="truncate text-xs text-muted-foreground">
              {user?.email && !user.email.endsWith('@builtbybit.local')
                ? user.email
                : 'BuiltByBit account'}
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => void logout()}>
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Server className="h-4 w-4" /> About
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 text-sm">
          <Info label="Version" value={runtime?.version ?? '—'} />
          <Info label="Platform" value={runtime?.platform ?? '—'} />
          <Info label="Local server" value={runtime?.serverUrl ?? '—'} />
          <Info
            label="BBB OAuth"
            value={runtime?.bbbOAuthConfigured ? 'Configured' : 'Not configured'}
          />
          <Info
            label="Discord OAuth"
            value={runtime?.discordConfigured ? 'Configured' : 'Not configured'}
          />
        </CardContent>
      </Card>
    </div>
  )
}

function OAuthCard(): React.JSX.Element {
  const { runtime, configureOAuth, clearOAuthConfig } = useAuth()
  const { toast } = useToast()
  const [status, setStatus] = React.useState<OAuthConfigStatus | null>(null)
  const [clientId, setClientId] = React.useState('')
  const [clientSecret, setClientSecret] = React.useState('')
  const [saving, setSaving] = React.useState(false)
  const [copied, setCopied] = React.useState(false)

  const refreshStatus = React.useCallback(async () => {
    try {
      setStatus(await window.api.getOAuthConfig())
    } catch {
      /* ignore */
    }
  }, [])

  React.useEffect(() => {
    void refreshStatus()
  }, [refreshStatus])

  const configured = status?.configured ?? runtime?.bbbOAuthConfigured ?? false
  const redirectUri = `http://localhost:${runtime?.authPort ?? 8788}/api/auth/callback/builtbybit`

  const copyRedirect = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(redirectUri)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* ignore */
    }
  }

  const save = async (): Promise<void> => {
    if (!clientId.trim() || !clientSecret.trim()) return
    setSaving(true)
    try {
      await configureOAuth(clientId.trim(), clientSecret.trim())
      setClientId('')
      setClientSecret('')
      await refreshStatus()
      toast({ variant: 'success', title: 'OAuth updated', description: 'Credentials saved.' })
    } catch (err) {
      toast({
        variant: 'error',
        title: 'Could not save credentials',
        description: err instanceof Error ? err.message : 'Unknown error'
      })
    } finally {
      setSaving(false)
    }
  }

  const remove = async (): Promise<void> => {
    try {
      await clearOAuthConfig()
      await refreshStatus()
      toast({ variant: 'success', title: 'OAuth removed', description: 'Credentials cleared.' })
    } catch (err) {
      toast({
        variant: 'error',
        title: 'Could not remove credentials',
        description: err instanceof Error ? err.message : 'Unknown error'
      })
    }
  }

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Fingerprint className="h-4 w-4" /> BuiltByBit OAuth application
        </CardTitle>
        <CardDescription>
          The OAuth app used to sign you in. Register your own on BuiltByBit and paste its
          credentials here — they're stored encrypted in the macOS Keychain.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {configured ? (
          <div className="flex items-center gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Configured</span>
                <Badge variant="success">
                  <CheckCircle2 className="h-3 w-3" /> Active
                </Badge>
                {status?.source === 'env' ? (
                  <span className="text-xs text-muted-foreground">from .env</span>
                ) : null}
              </div>
              {status?.clientId ? (
                <div className="truncate text-xs text-muted-foreground">{status.clientId}</div>
              ) : null}
            </div>
            {status?.source === 'keystore' ? (
              <Button variant="outline" size="sm" onClick={() => void remove()}>
                <Link2Off className="h-3.5 w-3.5" />
                Remove
              </Button>
            ) : null}
          </div>
        ) : null}

        <div className="rounded-lg border border-border bg-background/40 p-2.5">
          <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Redirect URI to register
          </div>
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate text-xs">{redirectUri}</code>
            <button
              onClick={() => void copyRedirect()}
              className="flex shrink-0 items-center gap-1 rounded-md border border-border px-1.5 py-1 text-[11px] text-muted-foreground hover:text-foreground"
              title="Copy redirect URI"
            >
              {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <div>
            <Label htmlFor="oauthClientId">{configured ? 'Replace Client ID' : 'Client ID'}</Label>
            <Input
              id="oauthClientId"
              className="mt-1.5"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="client-…"
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          <div>
            <Label htmlFor="oauthClientSecret">Client Secret</Label>
            <div className="mt-1.5 flex gap-2">
              <Input
                id="oauthClientSecret"
                type="password"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && void save()}
                placeholder="secret-…"
                autoComplete="off"
                spellCheck={false}
              />
              <Button onClick={() => void save()} disabled={!clientId.trim() || !clientSecret.trim() || saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                Save
              </Button>
            </div>
          </div>
          <button
            onClick={() => window.open('https://builtbybit.com/account/external', '_blank')}
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <ExternalLink className="h-3 w-3" />
            Register a BuiltByBit OAuth application
          </button>
        </div>
      </CardContent>
    </Card>
  )
}

function Info({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div className="rounded-lg border border-border bg-background/40 p-2.5">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-0.5 truncate font-medium">{value}</div>
    </div>
  )
}
