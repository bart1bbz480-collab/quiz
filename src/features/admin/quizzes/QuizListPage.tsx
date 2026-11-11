import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Edit, Play, Archive, Copy, BarChart2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import { useQuizzes, useActivateQuiz, useArchiveQuiz, useDuplicateQuiz, useDeleteQuiz } from './hooks/useQuizzes'
import type { Quiz, QuizStatus } from '@/types'

const statusLabel: Record<QuizStatus, string> = {
  draft: 'Concept',
  active: 'Actief',
  archived: 'Gearchiveerd',
}

const statusVariant: Record<QuizStatus, 'default' | 'success' | 'secondary' | 'outline'> = {
  draft: 'secondary',
  active: 'success',
  archived: 'outline',
}

export function QuizListPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { data: quizzes, isLoading } = useQuizzes()
  const activate = useActivateQuiz()
  const archive = useArchiveQuiz()
  const duplicate = useDuplicateQuiz()
  const deleteQuiz = useDeleteQuiz()

  const [confirmActivate, setConfirmActivate] = useState<Quiz | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Quiz | null>(null)

  const handleActivate = async (quiz: Quiz) => {
    const hasActive = quizzes?.some((q) => q.status === 'active' && q.id !== quiz.id)
    if (hasActive) { setConfirmActivate(quiz); return }
    await doActivate(quiz.id)
  }

  const doActivate = async (id: string) => {
    try {
      await activate.mutateAsync(id)
      toast({ title: 'Vragenlijst geactiveerd', variant: 'success' })
    } catch (e) {
      toast({ title: 'Activeren mislukt', description: (e as Error).message, variant: 'destructive' })
    }
    setConfirmActivate(null)
  }

  const handleArchive = async (id: string) => {
    try {
      await archive.mutateAsync(id)
      toast({ title: 'Gearchiveerd', variant: 'success' })
    } catch (e) {
      toast({ title: 'Archiveren mislukt', description: (e as Error).message, variant: 'destructive' })
    }
  }

  const handleDuplicate = async (id: string) => {
    try {
      const newId = await duplicate.mutateAsync(id)
      toast({ title: 'Gedupliceerd', variant: 'success' })
      navigate(`/admin/quizzes/${newId}`)
    } catch (e) {
      toast({ title: 'Dupliceren mislukt', description: (e as Error).message, variant: 'destructive' })
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteQuiz.mutateAsync(id)
      toast({ title: 'Verwijderd', variant: 'success' })
    } catch (e) {
      toast({ title: 'Verwijderen mislukt', description: (e as Error).message, variant: 'destructive' })
    }
    setConfirmDelete(null)
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">Vragenlijsten</h1>
        <Button onClick={() => navigate('/admin/quizzes/new')}>
          <Plus className="h-4 w-4" /> Nieuwe vragenlijst
        </Button>
      </div>

      {isLoading && <p className="text-muted-foreground text-sm">Laden…</p>}

      {!isLoading && (!quizzes || quizzes.length === 0) && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground text-sm">
            Nog geen vragenlijsten. Maak er een aan.
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {quizzes?.map((quiz) => (
          <Card key={quiz.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium truncate">{quiz.title}</span>
                    <Badge variant={statusVariant[quiz.status]}>{statusLabel[quiz.status]}</Badge>
                    {quiz.is_locked && (
                      <Badge variant="warning">Vergrendeld</Badge>
                    )}
                    {quiz.version > 1 && (
                      <span className="text-xs text-muted-foreground">v{quiz.version}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0 flex-wrap justify-end">
                  <Button size="sm" variant="ghost" onClick={() => navigate(`/admin/quizzes/${quiz.id}`)}>
                    <Edit className="h-4 w-4" />
                    <span className="hidden sm:inline ml-1">Bewerken</span>
                  </Button>

                  {quiz.status !== 'active' && (
                    <Button size="sm" variant="ghost" onClick={() => handleActivate(quiz)}>
                      <Play className="h-4 w-4 text-green-600" />
                      <span className="hidden sm:inline ml-1">Activeren</span>
                    </Button>
                  )}

                  {quiz.status === 'active' && (
                    <Button size="sm" variant="ghost" onClick={() => handleArchive(quiz.id)}>
                      <Archive className="h-4 w-4" />
                      <span className="hidden sm:inline ml-1">Archiveren</span>
                    </Button>
                  )}

                  <Button size="sm" variant="ghost" onClick={() => navigate(`/admin/results/${quiz.id}`)}>
                    <BarChart2 className="h-4 w-4" />
                    <span className="hidden sm:inline ml-1">Resultaten</span>
                  </Button>

                  <Button size="sm" variant="ghost" onClick={() => handleDuplicate(quiz.id)}>
                    <Copy className="h-4 w-4" />
                    <span className="hidden sm:inline ml-1">Dupliceren</span>
                  </Button>

                  {quiz.status !== 'active' && (
                    <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(quiz)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bevestiging activeren */}
      <Dialog open={!!confirmActivate} onOpenChange={() => setConfirmActivate(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vragenlijst activeren</DialogTitle>
            <DialogDescription>
              Er is al een actieve vragenlijst. Die wordt automatisch gearchiveerd.
              Wil je doorgaan?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setConfirmActivate(null)}>Annuleren</Button>
            <Button onClick={() => confirmActivate && doActivate(confirmActivate.id)}>
              Activeren
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bevestiging verwijderen */}
      <Dialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vragenlijst verwijderen</DialogTitle>
            <DialogDescription>
              Wil je <strong>"{confirmDelete?.title}"</strong> definitief verwijderen?
              {confirmDelete?.is_locked && (
                <span className="block mt-2 text-destructive font-medium">
                  Let op: deze vragenlijst heeft enquêtedata. Alle antwoorden worden ook permanent verwijderd.
                </span>
              )}
              {!confirmDelete?.is_locked && ' Dit kan niet ongedaan gemaakt worden.'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>Annuleren</Button>
            <Button variant="destructive" onClick={() => confirmDelete && handleDelete(confirmDelete.id)}>
              Definitief verwijderen
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
