import { supabase } from './supabase'
import {
  addToQueue,
  getQueue,
  incrementTodayStats,
  removeFromQueue,
  updateQueueItem,
} from './db'
import type { InterviewPayload, QueueItem } from '@/types'

const APP_VERSION = import.meta.env.VITE_APP_VERSION ?? '0.1.0'

// ─── Enquête toevoegen aan de wachtrij en direct synchroniseren ───────────────

export async function submitInterview(payload: Omit<InterviewPayload, 'app_version' | 'user_agent'>): Promise<void> {
  const fullPayload: InterviewPayload = {
    ...payload,
    app_version: APP_VERSION,
    user_agent: navigator.userAgent.slice(0, 300),
  }

  const item: QueueItem = {
    id: fullPayload.id,
    payload: fullPayload,
    attempts: 0,
    last_error: null,
    created_at: new Date().toISOString(),
  }

  await addToQueue(item)
  await incrementTodayStats()
  void syncQueue()
}

// ─── Synchroniseer alle wachtrij-items naar Supabase ─────────────────────────

let isSyncing = false

export async function syncQueue(): Promise<{ synced: number; failed: number }> {
  if (isSyncing) return { synced: 0, failed: 0 }
  isSyncing = true

  let synced = 0
  let failed = 0

  const MAX_ATTEMPTS = 5

  try {
    const queue = await getQueue()
    if (queue.length === 0) return { synced: 0, failed: 0 }

    for (const item of queue) {
      // Permanent mislukt: verwijder item na te veel pogingen
      if (item.attempts >= MAX_ATTEMPTS) {
        await removeFromQueue(item.id)
        continue
      }

      try {
        const { error } = await supabase.rpc('submit_interview', {
          payload: item.payload,
        })

        if (error) {
          await updateQueueItem(item.id, {
            attempts: item.attempts + 1,
            last_error: error.message,
          })
          failed++
        } else {
          await removeFromQueue(item.id)
          synced++
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Onbekende fout'
        await updateQueueItem(item.id, {
          attempts: item.attempts + 1,
          last_error: message,
        })
        failed++
      }
    }
  } finally {
    isSyncing = false
  }

  return { synced, failed }
}

// ─── Achtergrond-retry interval (elke 60 s als er items in de wachtrij zijn) ──

let retryInterval: ReturnType<typeof setInterval> | null = null

export function startSyncRetry(): void {
  if (retryInterval) return
  retryInterval = setInterval(async () => {
    const queue = await getQueue()
    if (queue.length > 0 && navigator.onLine) {
      void syncQueue()
    }
  }, 60_000)
}

export function stopSyncRetry(): void {
  if (retryInterval) {
    clearInterval(retryInterval)
    retryInterval = null
  }
}

// ─── Online event listener ────────────────────────────────────────────────────

export function setupOnlineListener(): () => void {
  const handler = () => {
    if (navigator.onLine) void syncQueue()
  }
  window.addEventListener('online', handler)
  return () => window.removeEventListener('online', handler)
}

// ─── Wachtrij-status ──────────────────────────────────────────────────────────

export async function getQueueCount(): Promise<number> {
  const queue = await getQueue()
  return queue.length
}
