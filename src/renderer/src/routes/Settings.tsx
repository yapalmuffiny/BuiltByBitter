import * as React from 'react'
import {
  KeyRound,
  Loader2,
  LogOut,
  CheckCircle2,
  Link2Off,
  ShieldCheck,
  ExternalLink,
  Server
} from 'lucide-react'
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
  const { user, runtime, logout } = useAuth()
  const { connection, connect, disconnect } = useData()
  const { toast } = useToast()
  const [apiKey, setApiKey] = React.useState('')
  const [connecting, setConnecting] = React.useState(false)

  const connected = connection?.connected && connection?.keyValid
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
      {/* BuiltByBit connection */}
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

      {/* Account */}
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

      {/* About */}
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

function Info({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div className="rounded-lg border border-border bg-background/40 p-2.5">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-0.5 truncate font-medium">{value}</div>
    </div>
  )
}
