/**
 * Lichtgewicht toast — geen externe dependency.
 * Gebruik: const { toast } = useToast()
 * toast({ title: 'Opgeslagen', variant: 'success' })
 */
import * as React from 'react'
import { cn } from '@/lib/utils'

export type ToastVariant = 'default' | 'success' | 'destructive'

interface ToastItem {
  id: string
  title: string
  description?: string
  variant?: ToastVariant
}

interface ToastContextValue {
  toast: (item: Omit<ToastItem, 'id'>) => void
}

const ToastContext = React.createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([])

  const toast = React.useCallback((item: Omit<ToastItem, 'id'>) => {
    const id = crypto.randomUUID()
    setToasts((prev) => [...prev, { ...item, id }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000)
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-80">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'rounded-lg border p-4 shadow-lg text-sm animate-in slide-in-from-bottom-2',
              t.variant === 'success' && 'bg-green-50 border-green-200 text-green-900',
              t.variant === 'destructive' && 'bg-red-50 border-red-200 text-red-900',
              (!t.variant || t.variant === 'default') && 'bg-white border-border text-foreground'
            )}
          >
            <p className="font-medium">{t.title}</p>
            {t.description && <p className="text-xs opacity-80 mt-0.5">{t.description}</p>}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = React.useContext(ToastContext)
  if (!ctx) throw new Error('useToast moet binnen ToastProvider gebruikt worden')
  return ctx
}
