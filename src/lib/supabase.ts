import { createClient } from '@supabase/supabase-js'
import type {
  Interview,
  Interviewer,
  InterviewPayload,
  Option,
  Question,
  Quiz,
} from '@/types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'VITE_SUPABASE_URL en VITE_SUPABASE_ANON_KEY zijn vereist. Maak een .env.local aan.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

// ─── Database types voor Supabase ─────────────────────────────────────────────

export interface Database {
  public: {
    Tables: {
      admins: { Row: { user_id: string; created_at: string } }
      app_settings: {
        Row: { id: 1; access_code_hash: string; updated_at: string }
      }
      interviewers: { Row: Interviewer }
      interviewer_sessions: {
        Row: { user_id: string; interviewer_id: string; created_at: string }
      }
      quizzes: { Row: Quiz }
      questions: { Row: Question }
      options: { Row: Option }
      interviews: { Row: Interview }
      answers: {
        Row: { interview_id: string; question_id: string; option_id: string }
      }
    }
    Functions: {
      register_interviewer: {
        Args: { first_name: string; code: string }
        Returns: Interviewer
      }
      get_active_quiz: { Args: Record<never, never>; Returns: Quiz }
      submit_interview: { Args: { payload: InterviewPayload }; Returns: void }
      duplicate_quiz: { Args: { quiz_id: string }; Returns: string }
      set_access_code: { Args: { code: string }; Returns: void }
      activate_quiz: { Args: { quiz_id: string }; Returns: void }
      quiz_results: {
        Args: { quiz_id: string; include_aborted: boolean }
        Returns: QuizResultRow[]
      }
    }
  }
}

export interface QuizResultRow {
  question_id: string
  question_position: number
  question_text_nl: string
  option_id: string
  option_position: number
  option_label_nl: string
  count: number
  total_n: number
}
