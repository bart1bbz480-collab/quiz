import { useNavigate, Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export function LoginPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30 p-4 gap-6">
      <Button
        size="lg"
        className="w-full max-w-sm h-16 text-xl"
        onClick={() => navigate('/survey')}
      >
        Start quiz
      </Button>

      <Link
        to="/admin"
        className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
      >
        Admin
      </Link>
    </div>
  )
}
