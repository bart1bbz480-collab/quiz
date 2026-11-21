import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { getCurrentSession, incrementSession } from '@/lib/device'

export function LoginPage() {
  const navigate = useNavigate()
  const [sessionNum, setSessionNum] = useState(() => getCurrentSession())
  const [showResetDialog, setShowResetDialog] = useState(false)

  const handleResetSession = () => {
    const next = incrementSession()
    setSessionNum(next)
    setShowResetDialog(false)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30 p-4 gap-8">
      <img
        src="/icons/icon-512.png"
        alt="Het Kan Anders"
        className="w-48 h-48 rounded-full shadow-lg"
        draggable={false}
      />

      <Button
        size="lg"
        className="w-full max-w-sm h-16 text-xl"
        onClick={() => navigate('/survey')}
      >
        Start quiz
      </Button>

      <button
        onClick={() => setShowResetDialog(true)}
        className="text-sm text-primary/60 hover:text-primary transition-colors select-none touch-manipulation"
      >
        Sessie {sessionNum} · Nieuw starten
      </button>

      <Link
        to="/admin"
        className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
      >
        Admin
      </Link>

      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nieuwe sessie starten</DialogTitle>
            <DialogDescription>
              De teller op dit apparaat wordt op nul gezet. Alle vorige antwoorden
              blijven bewaard en zijn zichtbaar in het admin-overzicht.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowResetDialog(false)}>Annuleren</Button>
            <Button onClick={handleResetSession}>Nieuwe sessie starten</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
