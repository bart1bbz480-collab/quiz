import { Outlet, useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAdminAuth } from '@/features/auth/useAdminAuth'

export function AdminLayout() {
  const { signOut } = useAdminAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/admin', { replace: true })
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border bg-white px-4 py-3 flex items-center justify-between gap-4">
        <span className="font-semibold text-foreground text-sm">Het Kan Anders — Admin</span>
        <Button variant="ghost" size="sm" onClick={handleSignOut}>
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline ml-1">Uitloggen</span>
        </Button>
      </header>
      <main className="flex-1 p-4 md:p-6">
        <Outlet />
      </main>
    </div>
  )
}
