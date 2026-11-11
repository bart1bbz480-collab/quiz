import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAdminAuth } from './useAdminAuth'

export function AdminGuard({ children }: { children: ReactNode }) {
  const { state } = useAdminAuth()

  if (state === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Laden…</p>
      </div>
    )
  }

  if (state === 'unauthenticated') return <Navigate to="/admin" replace />

  if (state === 'no-access') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium text-foreground">Geen toegang</p>
          <p className="text-sm text-muted-foreground mt-1">Dit account heeft geen admin-rechten.</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
