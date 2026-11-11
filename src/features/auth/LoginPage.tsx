import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useInterviewerAuth } from './useInterviewerAuth'
import { useEffect } from 'react'

export function LoginPage() {
  const navigate = useNavigate()
  const { state, login } = useInterviewerAuth()
  const [firstName, setFirstName] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (state === 'authenticated') {
      navigate('/home', { replace: true })
    }
  }, [state, navigate])

  if (state === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Laden…</p>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!firstName.trim()) { setError('Voer je voornaam in.'); return }
    if (!code.trim()) { setError('Voer de code in.'); return }
    setError('')
    setLoading(true)
    try {
      await login(firstName, code)
      navigate('/home', { replace: true })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Inloggen</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="firstName">Voornaam</Label>
              <Input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Jouw voornaam"
                autoComplete="given-name"
                autoCapitalize="words"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="code">Code</Label>
              <Input
                id="code"
                type="password"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Toegangscode"
                autoComplete="off"
                required
              />
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Inloggen…' : 'Inloggen'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Link
        to="/admin"
        className="mt-6 text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
      >
        Inloggen als admin
      </Link>
    </div>
  )
}
