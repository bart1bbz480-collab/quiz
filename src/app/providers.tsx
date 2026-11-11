import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect, type ReactNode } from 'react'
import { ToastProvider } from '@/components/ui/toast'
import { startSyncRetry, stopSyncRetry, setupOnlineListener } from '@/lib/sync'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
})

function SyncSetup() {
  useEffect(() => {
    startSyncRetry()
    const cleanup = setupOnlineListener()
    return () => {
      stopSyncRetry()
      cleanup()
    }
  }, [])
  return null
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <SyncSetup />
        {children}
      </ToastProvider>
    </QueryClientProvider>
  )
}
