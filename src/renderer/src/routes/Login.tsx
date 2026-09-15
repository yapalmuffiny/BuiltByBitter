import * as React from 'react'
import { Loader2, Package, ShieldCheck } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'

function DiscordGlyph(): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
      <path d="M20.317 4.369A19.79 19.79 0 0 0 15.885 3c-.2.36-.43.842-.59 1.226a18.27 18.27 0 0 0-5.6 0A12.6 12.6 0 0 0 9.1 3a19.7 19.7 0 0 0-4.432 1.37C1.86 8.59 1.1 12.7 1.48 16.75a19.9 19.9 0 0 0 6.06 3.06c.49-.67.926-1.38 1.3-2.13-.71-.27-1.39-.6-2.03-.99.17-.13.34-.26.5-.4a14.2 14.2 0 0 0 12.38 0c.16.14.33.27.5.4-.64.39-1.32.72-2.03.99.374.75.81 1.46 1.3 2.13a19.86 19.86 0 0 0 6.06-3.06c.44-4.68-.76-8.75-3.68-12.38ZM8.02 14.33c-1.18 0-2.15-1.09-2.15-2.42 0-1.34.95-2.43 2.15-2.43s2.17 1.1 2.15 2.43c0 1.33-.95 2.42-2.15 2.42Zm7.96 0c-1.18 0-2.15-1.09-2.15-2.42 0-1.34.95-2.43 2.15-2.43s2.17 1.1 2.15 2.43c0 1.33-.94 2.42-2.15 2.42Z" />
    </svg>
  )
}

export function Login(): React.JSX.Element {
  const { runtime, loginWith, signingIn } = useAuth()
  const { toast } = useToast()
  const [provider, setProvider] = React.useState<'builtbybit' | 'discord' | null>(null)

  const handle = async (p: 'builtbybit' | 'discord'): Promise<void> => {
    setProvider(p)
    try {
      await loginWith(p)
    } catch (err) {
      toast({
        variant: 'error',
        title: 'Sign-in failed',
        description: err instanceof Error ? err.message : 'Unknown error'
      })
    } finally {
      setProvider(null)
    }
  }

  const bbbOn = runtime?.bbbOAuthConfigured
  const discordOn = runtime?.discordConfigured

  return (
    <div className="drag-region relative flex h-screen flex-col items-center justify-center overflow-hidden bg-background">
      <div className="no-drag relative z-10 w-full max-w-sm px-6">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/15 text-primary shadow-lg shadow-primary/10">
            <Package className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">BuiltByBitter</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Manage your BuiltByBit resources, addons, and updates.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Button
            size="lg"
            className="w-full"
            disabled={!bbbOn || signingIn}
            onClick={() => handle('builtbybit')}
          >
            {provider === 'builtbybit' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Package className="h-4 w-4" />
            )}
            Login with BuiltByBit
          </Button>

          {discordOn ? (
            <Button
              size="lg"
              variant="secondary"
              className="w-full"
              disabled={signingIn}
              onClick={() => handle('discord')}
            >
              {provider === 'discord' ? <Loader2 className="h-4 w-4 animate-spin" /> : <DiscordGlyph />}
              Continue with Discord
            </Button>
          ) : null}
        </div>

        {!bbbOn ? (
          <p className="mt-5 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-300/90">
            BuiltByBit OAuth isn't configured. Add <code className="text-amber-200">BBB_OAUTH_CLIENT_ID</code>{' '}
            and <code className="text-amber-200">BBB_OAUTH_CLIENT_SECRET</code> to your <code>.env</code>,
            then restart.
          </p>
        ) : (
          <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5" />
            Sign-in happens in a secure window. Your API key is added afterwards.
          </div>
        )}
      </div>
    </div>
  )
}
