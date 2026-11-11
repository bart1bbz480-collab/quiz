import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { RefreshCw, LogOut, Wifi, WifiOff } from 'lucide-react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { useInterviewerAuth } from '@/features/auth/useInterviewerAuth'
import { useInstallPrompt } from '@/features/install/useInstallPrompt'
import { supabase } from '@/lib/supabase'
import { getActiveQuiz, getTodayStats, saveActiveQuiz } from '@/lib/db'
import { getQueueCount } from '@/lib/sync'
import { precacheQuizImages } from '@/lib/image'
import { syncQueue } from '@/lib/sync'
import type { Quiz } from '@/types'

export function InterviewerHome() {
  const navigate = useNavigate()
  const { state, session, logout } = useInterviewerAuth()
  const { installState } = useInstallPrompt()

  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW()

  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [quizLoading, setQuizLoading] = useState(true)
  const [todayCount, setTodayCount] = useState(0)
  const [queueCount, setQueueCount] = useState(0)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [confirmLogout, setConfirmLogout] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  // Redirect als niet ingelogd
  useEffect(() => {
    if (state === 'unauthenticated') navigate('/', { replace: true })
  }, [state, navigate])

  // Online/offline listener
  useEffect(() => {
    const onOnline = () => setIsOnline(true)
    const onOffline = () => setIsOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  const loadQuiz = useCallback(async () => {
    setQuizLoading(true)
    try {
      if (isOnline) {
        const { data } = await supabase.rpc('get_active_quiz')
        if (data) {
          const fetchedQuiz = data as Quiz
          await saveActiveQuiz(fetchedQuiz)
          // Afbeeldingen precachen
          const imagePaths = [
            fetchedQuiz.thanks_image_path,
            ...(fetchedQuiz.questions ?? []).flatMap((q) => [
              q.image_path,
              ...(q.options ?? []).map((o) => o.image_path),
            ]),
          ]
          void precacheQuizImages(imagePaths)
          setQuiz(fetchedQuiz)
        } else {
          setQuiz(null)
        }
      } else {
        // Offline: gebruik gecachte quiz
        const cached = await getActiveQuiz()
        setQuiz(cached)
      }
    } catch {
      // Fallback op cache bij fout
      const cached = await getActiveQuiz()
      setQuiz(cached)
    } finally {
      setQuizLoading(false)
    }
  }, [isOnline])

  const loadStats = useCallback(async () => {
    const [today, queue] = await Promise.all([getTodayStats(), getQueueCount()])
    setTodayCount(today)
    setQueueCount(queue)
  }, [])

  // Initieel laden + bij terugkeer naar pagina
  useEffect(() => {
    void loadQuiz()
    void loadStats()

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void loadQuiz()
        void loadStats()
        if (navigator.onLine) void syncQueue()
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [loadQuiz, loadStats])

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadQuiz()
    await loadStats()
    if (navigator.onLine) await syncQueue()
    setRefreshing(false)
  }

  const handleLogout = async () => {
    if (queueCount > 0) {
      setConfirmLogout(true)
      return
    }
    await logout()
    navigate('/', { replace: true })
  }

  const handleStartSurvey = () => {
    navigate('/survey')
  }

  const isInstalled = installState === 'installed' || installState === 'dev-bypass'
  const canStart = isInstalled && !!quiz && !quizLoading

  if (state === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Laden…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      {/* Header */}
      <header className="bg-white border-b border-border px-4 py-3 flex items-center justify-between">
        <div>
          <p className="font-semibold text-sm">Hallo, {session?.first_name}</p>
          <div className="flex items-center gap-1 mt-0.5">
            {isOnline
              ? <><Wifi className="h-3 w-3 text-green-600" /><span className="text-xs text-green-600">Online</span></>
              : <><WifiOff className="h-3 w-3 text-muted-foreground" /><span className="text-xs text-muted-foreground">Offline</span></>
            }
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Body */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 gap-5 max-w-md mx-auto w-full">

        {/* Stats */}
        <div className="flex gap-3 w-full">
          <Card className="flex-1">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{todayCount}</p>
              <p className="text-xs text-muted-foreground">Vandaag</p>
            </CardContent>
          </Card>
          <Card className="flex-1">
            <CardContent className="p-4 text-center">
              <p className={`text-2xl font-bold ${queueCount > 0 ? 'text-amber-600' : ''}`}>{queueCount}</p>
              <p className="text-xs text-muted-foreground">In wachtrij</p>
            </CardContent>
          </Card>
        </div>

        {/* Update-melding */}
        {needRefresh && (
          <Card className="w-full border-blue-200 bg-blue-50">
            <CardContent className="p-4 flex items-center justify-between gap-3">
              <p className="text-sm text-blue-800 font-medium">Nieuwe versie beschikbaar</p>
              <Button
                size="sm"
                onClick={() => updateServiceWorker(true)}
                className="shrink-0"
              >
                Bijwerken
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Quiz info */}
        <Card className="w-full">
          <CardContent className="p-4">
            {quizLoading ? (
              <p className="text-sm text-muted-foreground text-center">Vragenlijst laden…</p>
            ) : quiz ? (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="success">Actief</Badge>
                  <span className="text-sm font-medium">{quiz.title}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {quiz.questions?.length ?? 0} vragen · v{quiz.version}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center">Geen actieve vragenlijst</p>
            )}
          </CardContent>
        </Card>

        {/* Installatie waarschuwing */}
        {!isInstalled && (
          <Card className="w-full border-amber-200 bg-amber-50">
            <CardContent className="p-4">
              <p className="text-sm text-amber-800 font-medium">App niet geïnstalleerd</p>
              <p className="text-xs text-amber-700 mt-1">
                Installeer de app op je beginscherm om enquêtes te starten.
              </p>
              <Button
                size="sm"
                variant="outline"
                className="mt-2 border-amber-300 text-amber-800"
                onClick={() => navigate('/install')}
              >
                Installeren
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Start-knop */}
        <Button
          size="lg"
          className="w-full h-16 text-lg"
          disabled={!canStart}
          onClick={handleStartSurvey}
        >
          {quizLoading ? 'Vragenlijst laden…' : !quiz ? 'Geen vragenlijst' : 'Start enquête'}
        </Button>

        {queueCount > 0 && (
          <p className="text-xs text-amber-600 text-center">
            {queueCount} enquête{queueCount > 1 ? 's' : ''} wacht{queueCount === 1 ? '' : 'en'} op synchronisatie
          </p>
        )}
      </main>

      {/* Uitlog bevestiging */}
      <Dialog open={confirmLogout} onOpenChange={setConfirmLogout}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Uitloggen</DialogTitle>
            <DialogDescription>
              Er staan nog {queueCount} enquête{queueCount > 1 ? 's' : ''} in de wachtrij.
              Synchroniseer eerst voor je uitlogt.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setConfirmLogout(false)}>Annuleren</Button>
            <Button
              onClick={async () => {
                if (navigator.onLine) await syncQueue()
                await loadStats()
                setConfirmLogout(false)
              }}
            >
              Nu synchroniseren
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
