import { describe, it, expect } from 'vitest'
import { InterviewPayloadSchema, AccessCodeSchema } from '@/types'

const validPayload = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  quiz_id: '123e4567-e89b-12d3-a456-426614174001',
  language: 'nl' as const,
  status: 'completed' as const,
  aborted_at_position: null,
  started_at: '2026-11-11T10:00:00.000Z',
  ended_at: '2026-11-11T10:05:00.000Z',
  app_version: '0.1.0',
  user_agent: 'Mozilla/5.0',
  answers: [
    {
      question_id: '123e4567-e89b-12d3-a456-426614174002',
      option_id: '123e4567-e89b-12d3-a456-426614174003',
    },
  ],
}

describe('InterviewPayloadSchema', () => {
  it('accepteert een geldig completed interview', () => {
    const result = InterviewPayloadSchema.safeParse(validPayload)
    expect(result.success).toBe(true)
  })

  it('accepteert een geldig aborted interview', () => {
    const result = InterviewPayloadSchema.safeParse({
      ...validPayload,
      status: 'aborted',
      aborted_at_position: 2,
    })
    expect(result.success).toBe(true)
  })

  it('accepteert talen nl, fr, en', () => {
    for (const lang of ['nl', 'fr', 'en']) {
      const result = InterviewPayloadSchema.safeParse({ ...validPayload, language: lang })
      expect(result.success).toBe(true)
    }
  })

  it('weigert ongeldige taal', () => {
    const result = InterviewPayloadSchema.safeParse({ ...validPayload, language: 'de' })
    expect(result.success).toBe(false)
  })

  it('weigert ongeldige status', () => {
    const result = InterviewPayloadSchema.safeParse({ ...validPayload, status: 'pending' })
    expect(result.success).toBe(false)
  })

  it('weigert een ongeldige UUID voor id', () => {
    const result = InterviewPayloadSchema.safeParse({ ...validPayload, id: 'geen-uuid' })
    expect(result.success).toBe(false)
  })

  it('weigert ontbrekend verplicht veld', () => {
    const { quiz_id: _removed, ...rest } = validPayload
    const result = InterviewPayloadSchema.safeParse(rest)
    expect(result.success).toBe(false)
  })

  it('accepteert null app_version en user_agent', () => {
    const result = InterviewPayloadSchema.safeParse({
      ...validPayload,
      app_version: null,
      user_agent: null,
    })
    expect(result.success).toBe(true)
  })
})

describe('AccessCodeSchema', () => {
  it('accepteert een geldige code van 6+ tekens', () => {
    expect(AccessCodeSchema.safeParse({ code: 'abc123' }).success).toBe(true)
    expect(AccessCodeSchema.safeParse({ code: 'lang-wachtwoord-123' }).success).toBe(true)
  })

  it('weigert een code korter dan 6 tekens', () => {
    expect(AccessCodeSchema.safeParse({ code: 'ab12' }).success).toBe(false)
  })

  it('weigert een lege code', () => {
    expect(AccessCodeSchema.safeParse({ code: '' }).success).toBe(false)
  })
})
