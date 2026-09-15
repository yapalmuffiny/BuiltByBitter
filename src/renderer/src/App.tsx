import { Loader2, Package } from 'lucide-react'
import { useAuth } from './lib/auth-context'
import { DataProvider } from './lib/data-context'
import { UIProvider } from './lib/ui-context'
import { Login } from './routes/Login'
import { AppShell } from './components/AppShell'

function Splash(): React.JSX.Element {
  return (
    <div className="drag-region flex h-screen flex-col items-center justify-center gap-4 bg-background">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
        <Package className="h-7 w-7" />
      </div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Starting BuiltByBitter…
      </div>
    </div>
  )
}

export default function App(): React.JSX.Element {
  const { user, loading } = useAuth()

  if (loading) return <Splash />
  if (!user) return <Login />

  return (
    <DataProvider>
      <UIProvider>
        <AppShell />
      </UIProvider>
    </DataProvider>
  )
}
