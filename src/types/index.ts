import { z } from 'zod'

// ─── Constanten ───────────────────────────────────────────────────────────────

export const MAX_QUESTIONS = 10
export const MAX_OPTIONS = 5
export const MIN_OPTIONS = 2
export const ABORT_HOLD_MS = 2000
export const ANSWER_FEEDBACK_MS = 400

// ─── Enums ────────────────────────────────────────────────────────────────────

export type Language = 'nl' | 'fr' | 'en'
export type QuizStatus = 'draft' | 'active' | 'archived'
export type QuestionType = 'multiple_choice' | 'yes_no_unknown'
export type InterviewStatus = 'completed' | 'aborted'

// ─── Database types ───────────────────────────────────────────────────────────

export interface Option {
  id: string
  question_id: string
  position: number
  label_nl: string
  label_fr: string | null
  label_en: string | null
  image_path: string | null
}

export interface Question {
  id: string
  quiz_id: string
  position: number
  type: QuestionType
  text_nl: string
  text_fr: string | null
  text_en: string | null
  image_path: string | null
  options: Option[]
}

export interface Quiz {
  id: string
  title: string
  version: number
  parent_quiz_id: string | null
  status: QuizStatus
  is_locked: boolean
  campaign_url: string | null
  thanks_text_nl: string | null
  thanks_text_fr: string | null
  thanks_text_en: string | null
  thanks_image_path: string | null
  include_aborted: boolean
  created_at: string
  updated_at: string
  questions: Question[]
}

export interface Interviewer {
  id: string
  first_name: string
  first_name_key: string
  is_active: boolean
  created_at: string
}

export interface Interview {
  id: string
  quiz_id: string
  interviewer_id: string
  language: Language
  status: InterviewStatus
  aborted_at_position: number | null
  started_at: string
  ended_at: string
  synced_at: string | null
  app_version: string | null
  user_agent: string | null
}

export interface Answer {
  interview_id: string
  question_id: string
  option_id: string
}

// ─── Sync payload ─────────────────────────────────────────────────────────────

export const AnswerPayloadSchema = z.object({
  question_id: z.string().uuid(),
  option_id: z.string().uuid(),
})

export const InterviewPayloadSchema = z.object({
  id: z.string().uuid(),
  quiz_id: z.string().uuid(),
  language: z.enum(['nl', 'fr', 'en']),
  status: z.enum(['completed', 'aborted']),
  aborted_at_position: z.number().int().nullable(),
  started_at: z.string().datetime(),
  ended_at: z.string().datetime(),
  app_version: z.string().nullable(),
  user_agent: z.string().nullable(),
  answers: z.array(AnswerPayloadSchema),
})

export type InterviewPayload = z.infer<typeof InterviewPayloadSchema>

// ─── Lokale opslag types ──────────────────────────────────────────────────────

export interface LocalSession {
  id: 1
  interviewer_id: string | null
  first_name: string | null
  role: 'interviewer' | 'admin' | null
}

export interface QueueItem {
  id: string // = interview UUID
  payload: InterviewPayload
  attempts: number
  last_error: string | null
  created_at: string
}

export interface DailyStats {
  id: string // 'YYYY-MM-DD'
  count: number
}

// ─── Validatie schema's ───────────────────────────────────────────────────────

export const InterviewerLoginSchema = z.object({
  first_name: z.string().min(1, 'Voer je voornaam in').max(50),
  code: z.string().min(1, 'Voer de code in'),
})

export type InterviewerLoginData = z.infer<typeof InterviewerLoginSchema>

export const AdminLoginSchema = z.object({
  email: z.string().email('Ongeldig e-mailadres'),
  password: z.string().min(1, 'Voer je wachtwoord in'),
})

export type AdminLoginData = z.infer<typeof AdminLoginSchema>

export const AccessCodeSchema = z.object({
  code: z.string().min(6, 'Code moet minimaal 6 tekens zijn').max(100),
})

export const QuizFormSchema = z.object({
  title: z.string().min(1, 'Titel is verplicht').max(200),
  campaign_url: z.string().url('Ongeldige URL').nullable().or(z.literal('')),
  thanks_text_nl: z.string().max(500).nullable(),
  thanks_text_fr: z.string().max(500).nullable(),
  thanks_text_en: z.string().max(500).nullable(),
})
