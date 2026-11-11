import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export type AdminAuthState = 'loading' | 'authenticated' | 'unauthenticated' | 'no-access'

export function useAdminAuth() {
  const [state, setState] = useState<AdminAuthState>('loading')

  const checkAdmin = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setState('unauthenticated'); return }

    const { data, error } = await supabase
      .from('admins')
      .select('user_id')
      .eq('user_id', session.user.id)
      .maybeSingle()

    if (error || !data) setState('no-access')
    else setState('authenticated')
  }, [])

  useEffect(() => {
    void checkAdmin()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      void checkAdmin()
    })
    return () => subscription.unsubscribe()
  }, [checkAdmin])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setState('unauthenticated')
  }

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/admin`,
    })
    if (error) throw error
  }

  return { state, signIn, signOut, resetPassword }
}
