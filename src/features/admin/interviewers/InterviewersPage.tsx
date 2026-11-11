import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, UserX, UserCheck, Copy, QrCode } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import { supabase } from '@/lib/supabase'
import type { Interviewer } from '@/types'
import { QRCodeSVG } from 'qrcode.react'

interface InterviewerStats {
  id: string
  first_name: string
  is_active: boolean
  created_at: string
  total: number
  completed: number
  aborted: number
  last_interview: string | null
}

export function InterviewersPage() {
  const { toast } = useToast()
  const qc = useQueryClient()
  const appUrl = window.location.origin

  const [renameTarget, setRenameTarget] = useState<Interviewer | null>(null)
  const [newName, setNewName] = useState('')
  const [showQr, setShowQr] = useState(false)

  const { data: interviewers, isLoading } = useQuery({
    queryKey: ['interviewers-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('interviewers')
        .select(`
          id, first_name, is_active, created_at,
          interviews(status)
        `)
        .order('first_name')
      if (error) throw error

      return (data ?? []).map((row) => {
        const interviews = (row.interviews ?? []) as { status: string }[]
        return {
          id: row.id,
          first_name: row.first_name,
          is_active: row.is_active,
          created_at: row.created_at,
          total: interviews.length,
          completed: interviews.filter((i) => i.status === 'completed').length,
          aborted: interviews.filter((i) => i.status === 'aborted').length,
          last_interview: null,
        } as InterviewerStats
      })
    },
  })

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase
        .from('interviewers')
        .update({ is_active: active })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['interviewers-stats'] }),
  })

  const rename = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase
        .from('interviewers')
        .update({ first_name: name.trim(), first_name_key: name.trim().toLowerCase() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['interviewers-stats'] })
      setRenameTarget(null)
    },
  })

  const handleToggle = async (iv: InterviewerStats) => {
    try {
      await toggleActive.mutateAsync({ id: iv.id, active: !iv.is_active })
      toast({ title: iv.is_active ? 'Interviewer gedeactiveerd' : 'Interviewer geactiveerd', variant: 'success' })
    } catch (err) {
      toast({ title: 'Wijziging mislukt', description: (err as Error).message, variant: 'destructive' })
    }
  }

  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!renameTarget || !newName.trim()) return
    try {
      await rename.mutateAsync({ id: renameTarget.id, name: newName })
      toast({ title: 'Naam gewijzigd', variant: 'success' })
    } catch (err) {
      toast({ title: 'Hernoemen mislukt', description: (err as Error).message, variant: 'destructive' })
    }
  }

  const copyUrl = () => {
    navigator.clipboard.writeText(appUrl)
    toast({ title: 'Link gekopieerd', variant: 'success' })
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-xl font-semibold mb-6">Interviewers</h1>

      {/* App-link delen */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">App-link delen met interviewers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 flex-wrap">
            <code className="flex-1 min-w-0 text-sm bg-muted rounded px-3 py-2 truncate">{appUrl}</code>
            <Button variant="outline" size="sm" onClick={copyUrl}>
              <Copy className="h-4 w-4 mr-1" /> Kopiëren
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowQr(true)}>
              <QrCode className="h-4 w-4 mr-1" /> QR-code
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lijst */}
      {isLoading && <p className="text-sm text-muted-foreground">Laden…</p>}
      {!isLoading && (!interviewers || interviewers.length === 0) && (
        <p className="text-sm text-muted-foreground">Nog geen interviewers ingelogd.</p>
      )}

      <div className="space-y-2">
        {interviewers
          ?.sort((a, b) => b.completed - a.completed)
          .map((iv) => (
            <Card key={iv.id} className={!iv.is_active ? 'opacity-60' : ''}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div>
                      <span className="font-medium">{iv.first_name}</span>
                      {!iv.is_active && (
                        <Badge variant="secondary" className="ml-2 text-xs">Inactief</Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <span className="text-green-700 font-medium">{iv.completed}</span> afgewerkt
                      {iv.aborted > 0 && (
                        <span className="ml-2 text-muted-foreground">{iv.aborted} afgebroken</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => { setRenameTarget(iv as unknown as Interviewer); setNewName(iv.first_name) }}
                    >
                      <Pencil className="h-4 w-4" />
                      <span className="hidden sm:inline ml-1">Hernoemen</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleToggle(iv)}
                    >
                      {iv.is_active
                        ? <><UserX className="h-4 w-4 text-destructive" /><span className="hidden sm:inline ml-1">Deactiveren</span></>
                        : <><UserCheck className="h-4 w-4 text-green-600" /><span className="hidden sm:inline ml-1">Activeren</span></>
                      }
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
      </div>

      {/* Hernoemen dialog */}
      <Dialog open={!!renameTarget} onOpenChange={() => setRenameTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Interviewer hernoemen</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRename} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label htmlFor="rename">Nieuwe voornaam</Label>
              <Input
                id="rename"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setRenameTarget(null)}>
                Annuleren
              </Button>
              <Button type="submit" disabled={rename.isPending}>
                {rename.isPending ? 'Opslaan…' : 'Opslaan'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* QR-code dialog */}
      <Dialog open={showQr} onOpenChange={setShowQr}>
        <DialogContent className="max-w-xs text-center">
          <DialogHeader>
            <DialogTitle>App-link QR-code</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center py-4">
            <QRCodeSVG value={appUrl} size={200} />
          </div>
          <p className="text-xs text-muted-foreground">
            Laat interviewers de QR-code scannen om de app te openen.
          </p>
        </DialogContent>
      </Dialog>
    </div>
  )
}
