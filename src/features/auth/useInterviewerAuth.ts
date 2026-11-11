import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { clearSession, getSession, saveSession } from '@/lib/db'
import type { LocalSession } from '@/types'

export type InterviewerAuthState = 'loading' | 'authenticated' | 'unauthenticated'

export function useInterviewerAuth() {
  const [state, setState] = useState<InterviewerAuthState>('loading')
  const [session, setSession] = useState<LocalSession | null>(null)

  const loadSession = useCallback(async () => {
    // Eerst lokale sessie proberen (offline-ready)
    const local = await getSession()
    if (local?.interviewer_id && local.role === 'interviewer') {
      setSession(local)
      setState('authenticated')
      return
    }
    // Geen lokale sessie
    setState('unauthenticated')
  }, [])

  useEffect(() => {
    void loadSession()
  }, [loadSession])

  const login = async (firstName: string, code: string): Promise<void> => {
    // Anonieme Supabase-sessie aanmaken (of bestaande hergebruiken)
    const { data: existing } = await supabase.auth.getSession()
    if (!existing.session) {
      const { error } = await supabase.auth.signInAnonymously()
      if (error) throw new Error('Kon geen sessie aanmaken: ' + error.message)
    }

    // Interviewer registreren via RPC
    const { data, error } = await supabase.rpc('register_interviewer', {
      p_first_name: firstName.trim(),
      p_code: code,
    })

    if (error) {
      // Vertaal server-foutmeldingen
      if (error.message.includes('Ongeldige toegangscode')) throw new Error('Ongeldige code.')
      if (error.message.includes('gedeactiveerd')) throw new Error('Dit account is gedeactiveerd.')
      throw new Error(error.message)
    }

    const interviewer = data as { id: string; first_name: string }

    // Sessie lokaal opslaan
    const local: Omit<LocalSession, 'id'> = {
      interviewer_id: interviewer.id,
      first_name: interviewer.first_name,
      role: 'interviewer',
    }
    await saveSession(local)
    setSession({ id: 1, ...local })
    setState('authenticated')
  }

  const logout = async (): Promise<void> => {
    await clearSession()
    await supabase.auth.signOut()
    setSession(null)
    setState('unauthenticated')
  }

  return { state, session, login, logout }
}
