import { useEffect, useRef, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Pencil, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { getCurrentSession, incrementSession, getDeviceId, getDeviceName, setDeviceName } from '@/lib/device'
import { supabase } from '@/lib/supabase'

export function LoginPage() {
  const navigate = useNavigate()
  const [sessionNum, setSessionNum] = useState(() => getCurrentSession())
  const [showResetDialog, setShowResetDialog] = useState(false)

  const [deviceName, setDeviceNameState] = useState(() => getDeviceName() ?? '')
  const [editingName, setEditingName] = useState(false)
  const [draftName, setDraftName] = useState('')
  const nameInputRef = useRef<HTMLInputElement>(null)

  // Focus input when editing starts
  useEffect(() => {
    if (editingName) {
      setDraftName(deviceName)
      setTimeout(() => nameInputRef.current?.focus(), 50)
    }
  }, [editingName]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleResetSession = () => {
    const next = incrementSession()
    setSessionNum(next)
    setShowResetDialog(false)
  }

  const handleSaveName = async () => {
    const trimmed = draftName.trim()
    if (!trimmed) return
    setDeviceName(trimmed)
    setDeviceNameState(trimmed)
    setEditingName(false)
    // Sync naar Supabase
    await supabase.from('device_names').upsert({
      device_id: getDeviceId(),
      name: trimmed,
      updated_at: new Date().toISOString(),
    })
  }

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') void handleSaveName()
    if (e.key === 'Escape') setEditingName(false)
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

      {/* Apparaatnaam */}
      <div className="flex items-center gap-2">
        {editingName ? (
          <>
            <input
              ref={nameInputRef}
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              onKeyDown={handleNameKeyDown}
              onBlur={() => void handleSaveName()}
              maxLength={40}
              placeholder="Naam van dit apparaat"
              className="text-sm border border-border rounded-md px-2 py-1 bg-background w-48 text-center"
            />
            <button
              onMouseDown={(e) => { e.preventDefault(); void handleSaveName() }}
              className="text-primary hover:text-primary/80 transition-colors"
            >
              <Check className="h-4 w-4" />
            </button>
          </>
        ) : (
          <button
            onClick={() => setEditingName(true)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors group"
          >
            <span>{deviceName || 'Apparaat benoemen'}</span>
            <Pencil className="h-3.5 w-3.5 opacity-0 group-hover:opacity-60 transition-opacity" />
          </button>
        )}
      </div>

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
