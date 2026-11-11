import Dexie, { type Table } from 'dexie'
import type { DailyStats, LocalSession, QueueItem, Quiz } from '@/types'

// ─── IndexedDB schema via Dexie ───────────────────────────────────────────────

interface ActiveQuizRecord {
  id: 1
  quiz: Quiz
  updated_at: string
}

interface ImageRecord {
  path: string // Supabase Storage path = primary key
  blob: Blob
  cached_at: string
}

class QuizDatabase extends Dexie {
  session!: Table<LocalSession, number>
  activeQuiz!: Table<ActiveQuizRecord, number>
  images!: Table<ImageRecord, string>
  queue!: Table<QueueItem, string>
  stats!: Table<DailyStats, string>

  constructor() {
    super('QuizAppDB')

    this.version(1).stores({
      session: 'id',
      activeQuiz: 'id',
      images: 'path, cached_at',
      queue: 'id, created_at',
      stats: 'id',
    })
  }
}

export const db = new QuizDatabase()

// ─── Helpers ──────────────────────────────────────────────────────────────────

export async function getSession(): Promise<LocalSession | null> {
  const record = await db.session.get(1)
  return record ?? null
}

export async function saveSession(session: Omit<LocalSession, 'id'>): Promise<void> {
  await db.session.put({ id: 1, ...session })
}

export async function clearSession(): Promise<void> {
  await db.session.delete(1)
}

export async function getActiveQuiz(): Promise<Quiz | null> {
  const record = await db.activeQuiz.get(1)
  return record?.quiz ?? null
}

export async function saveActiveQuiz(quiz: Quiz): Promise<void> {
  await db.activeQuiz.put({ id: 1, quiz, updated_at: new Date().toISOString() })
}

export async function getCachedImage(path: string): Promise<Blob | null> {
  const record = await db.images.get(path)
  return record?.blob ?? null
}

export async function cacheImage(path: string, blob: Blob): Promise<void> {
  await db.images.put({ path, blob, cached_at: new Date().toISOString() })
}

export async function getQueue(): Promise<QueueItem[]> {
  return db.queue.orderBy('created_at').toArray()
}

export async function addToQueue(item: QueueItem): Promise<void> {
  await db.queue.put(item)
}

export async function removeFromQueue(id: string): Promise<void> {
  await db.queue.delete(id)
}

export async function updateQueueItem(
  id: string,
  updates: Partial<Pick<QueueItem, 'attempts' | 'last_error'>>
): Promise<void> {
  await db.queue.update(id, updates)
}

export async function getTodayStats(): Promise<number> {
  const today = new Date().toISOString().slice(0, 10)
  const record = await db.stats.get(today)
  return record?.count ?? 0
}

export async function incrementTodayStats(): Promise<void> {
  const today = new Date().toISOString().slice(0, 10)
  const existing = await db.stats.get(today)
  await db.stats.put({ id: today, count: (existing?.count ?? 0) + 1 })
}
