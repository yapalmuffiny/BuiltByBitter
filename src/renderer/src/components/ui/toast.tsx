import * as React from 'react'
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type ToastVariant = 'default' | 'success' | 'error' | 'info'

interface ToastItem {
  id: string
  title: string
  description?: string
  variant: ToastVariant
}

interface ToastContextValue {
  toast: (t: { title: string; description?: string; variant?: ToastVariant }) => void
}

const ToastContext = React.createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
  const ctx = React.useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

const ICONS: Record<ToastVariant, React.ReactNode> = {
  default: <Info className="h-4 w-4 text-muted-foreground" />,
  info: <Info className="h-4 w-4 text-primary" />,
  success: <CheckCircle2 className="h-4 w-4 text-emerald-400" />,
  error: <AlertTriangle className="h-4 w-4 text-red-400" />
}

export function ToastProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [toasts, setToasts] = React.useState<ToastItem[]>([])

  const remove = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = React.useCallback<ToastContextValue['toast']>(
    (t) => {
      const id = Math.random().toString(36).slice(2)
      const item: ToastItem = { id, ...t, variant: t.variant ?? 'default' }
      setToasts((prev) => [...prev, item])
      setTimeout(() => remove(id), item.variant === 'error' ? 7000 : 4200)
    },
    [remove]
  )

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[100] flex w-full max-w-sm flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto animate-fade-in overflow-hidden rounded-lg border border-border bg-popover p-3 pr-9 shadow-2xl',
              t.variant === 'error' && 'border-red-500/30',
              t.variant === 'success' && 'border-emerald-500/30'
            )}
          >
            <div className="flex items-start gap-2.5">
              <div className="mt-0.5">{ICONS[t.variant]}</div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">{t.title}</div>
                {t.description ? (
                  <div className="mt-0.5 break-words text-xs text-muted-foreground">{t.description}</div>
                ) : null}
              </div>
            </div>
            <button
              onClick={() => remove(t.id)}
              className="absolute right-2 top-2.5 rounded p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
