import { describe, it, expect, beforeEach } from 'vitest'
import {
  addToQueue,
  getQueue,
  removeFromQueue,
  updateQueueItem,
  getTodayStats,
  incrementTodayStats,
} from '@/lib/db'
import { getQueueCount } from '@/lib/sync'
import type { QueueItem, InterviewPayload } from '@/types'

function makeQueueItem(id: string): QueueItem {
  const payload: InterviewPayload = {
    id,
    quiz_id: '123e4567-e89b-12d3-a456-426614174001',
    language: 'nl',
    status: 'completed',
    aborted_at_position: null,
    started_at: '2026-11-11T10:00:00.000Z',
    ended_at: '2026-11-11T10:05:00.000Z',
    app_version: '0.1.0',
    user_agent: null,
    answers: [],
  }
  return {
    id,
    payload,
    attempts: 0,
    last_error: null,
    created_at: new Date().toISOString(),
  }
}

// Elk test start met een lege database (fake-indexeddb reset per module)
beforeEach(async () => {
  const queue = await getQueue()
  for (const item of queue) await removeFromQueue(item.id)
})

describe('queue helpers', () => {
  it('voegt items toe en haalt ze op', async () => {
    await addToQueue(makeQueueItem('id-1'))
    await addToQueue(makeQueueItem('id-2'))
    const queue = await getQueue()
    expect(queue).toHaveLength(2)
  })

  it('verwijdert een item uit de wachtrij', async () => {
    await addToQueue(makeQueueItem('id-del'))
    await removeFromQueue('id-del')
    const queue = await getQueue()
    expect(queue.find((q) => q.id === 'id-del')).toBeUndefined()
  })

  it('werkt attempts en last_error bij', async () => {
    await addToQueue(makeQueueItem('id-upd'))
    await updateQueueItem('id-upd', { attempts: 3, last_error: 'timeout' })
    const queue = await getQueue()
    const item = queue.find((q) => q.id === 'id-upd')!
    expect(item.attempts).toBe(3)
    expect(item.last_error).toBe('timeout')
  })

  it('getQueueCount geeft het correcte aantal terug', async () => {
    expect(await getQueueCount()).toBe(0)
    await addToQueue(makeQueueItem('id-c1'))
    await addToQueue(makeQueueItem('id-c2'))
    expect(await getQueueCount()).toBe(2)
  })

  it('addToQueue is idempotent (zelfde id = overschrijven)', async () => {
    const item = makeQueueItem('id-idem')
    await addToQueue(item)
    await addToQueue({ ...item, attempts: 5 })
    const queue = await getQueue()
    const found = queue.filter((q) => q.id === 'id-idem')
    expect(found).toHaveLength(1)
    expect(found[0].attempts).toBe(5)
  })
})

describe('stats helpers', () => {
  it('begint op 0 en verhoogt met 1', async () => {
    const before = await getTodayStats()
    await incrementTodayStats()
    const after = await getTodayStats()
    expect(after).toBe(before + 1)
  })

  it('verhoogt meerdere keren correct', async () => {
    const before = await getTodayStats()
    await incrementTodayStats()
    await incrementTodayStats()
    await incrementTodayStats()
    const after = await getTodayStats()
    expect(after).toBe(before + 3)
  })
})
