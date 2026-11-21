// ─── Device UUID + sessie beheer ─────────────────────────────────────────────
// UUID wordt aangemaakt bij eerste bezoek en opgeslagen in localStorage.
// Sessienummer verhogen = nieuwe teller; oude data blijft in Supabase.

const DEVICE_ID_KEY = 'hka_device_id'
const SESSION_KEY   = 'hka_session_id'

export function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(DEVICE_ID_KEY, id)
  }
  return id
}

export function getCurrentSession(): number {
  const raw = localStorage.getItem(SESSION_KEY)
  if (!raw) return 1
  const n = parseInt(raw, 10)
  return isNaN(n) ? 1 : n
}

export function incrementSession(): number {
  const next = getCurrentSession() + 1
  localStorage.setItem(SESSION_KEY, String(next))
  return next
}
