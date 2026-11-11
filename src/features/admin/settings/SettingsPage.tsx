import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/toast'
import { supabase } from '@/lib/supabase'

export function SettingsPage() {
  const { toast } = useToast()
  const [code, setCode] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (code.length < 6) {
      toast({ title: 'Code te kort', description: 'Minimaal 6 tekens.', variant: 'destructive' })
      return
    }
    if (code !== confirm) {
      toast({ title: 'Codes komen niet overeen', variant: 'destructive' })
      return
    }
    setLoading(true)
    try {
      const { error } = await supabase.rpc('set_access_code', { code })
      if (error) throw error
      toast({ title: 'Toegangscode opgeslagen', variant: 'success' })
      setCode('')
      setConfirm('')
    } catch (err) {
      toast({ title: 'Opslaan mislukt', description: (err as Error).message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-xl font-semibold mb-6">Instellingen</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Gedeelde toegangscode</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Interviewers gebruiken deze code om in te loggen. Deel hem via een beveiligde kanaal.
            Bestaande sessies blijven geldig na een codewijziging.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="code">Nieuwe code (min. 6 tekens)</Label>
              <Input
                id="code"
                type="password"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm">Bevestig code</Label>
              <Input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? 'Opslaan…' : 'Code instellen'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
