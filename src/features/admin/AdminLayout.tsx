import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useAdminAuth } from '@/features/auth/useAdminAuth'

const navItems = [
  { to: '/admin/quizzes', label: 'Vragenlijsten' },
]

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
        <div className="flex items-center gap-6">
          <span className="font-semibold text-foreground text-sm">Quiz Admin</span>
          <nav className="flex gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'px-3 py-1.5 rounded-md text-sm transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
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
