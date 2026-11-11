import { supabase } from '@/lib/supabase'
import { calculateResults, type QuestionResult } from '@/lib/results'
import type { QuizResultRow } from '@/lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ExportQuestion {
  id: string
  position: number
  text_nl: string
}

export interface ExportRawRow {
  id: string
  started_at: string
  interviewer: string
  language: string
  status: string
  answers: Record<string, string> // question_id → option_label_nl
}

export interface ExportInterviewerRow {
  name: string
  completed: number
  aborted: number
}

export interface ExportData {
  quizTitle: string
  quizVersion: number
  completed: number
  aborted: number
  first_at: string | null
  last_at: string | null
  questions: ExportQuestion[]
  results: QuestionResult[]
  rawRows: ExportRawRow[]
  ranking: ExportInterviewerRow[]
}

// ─── Data ophalen voor export ─────────────────────────────────────────────────

export async function fetchExportData(
  quizId: string,
  includeAborted: boolean,
): Promise<ExportData> {

  // 1. Quiz meta + vragen + opties
  const [quizRes, resultsRes, interviewRes] = await Promise.all([
    supabase
      .from('quizzes')
      .select('id, title, version')
      .eq('id', quizId)
      .single(),
    supabase.rpc('quiz_results', { quiz_id: quizId, include_aborted: includeAborted }),
    supabase
      .from('interviews')
      .select('id, status, language, started_at, interviewer_id')
      .eq('quiz_id', quizId),
  ])

  if (quizRes.error) throw new Error(quizRes.error.message)
  if (resultsRes.error) throw new Error(resultsRes.error.message)
  if (interviewRes.error) throw new Error(interviewRes.error.message)

  const allInterviews = interviewRes.data ?? []
  const filteredInterviews = allInterviews.filter(
    (iv) => iv.status === 'completed' || (includeAborted && iv.status === 'aborted'),
  )

  const completed = allInterviews.filter((i) => i.status === 'completed').length
  const aborted = allInterviews.filter((i) => i.status === 'aborted').length
  const dates = filteredInterviews.map((i) => i.started_at).sort()

  const results = calculateResults(resultsRes.data as QuizResultRow[])

  // Questions in volgorde (uit results)
  const questions: ExportQuestion[] = results.map((r) => ({
    id: r.question_id,
    position: r.question_position,
    text_nl: r.question_text_nl,
  }))

  // 2. Antwoorden ophalen voor gefilterde interviews
  let rawRows: ExportRawRow[] = []
  let ranking: ExportInterviewerRow[] = []

  if (filteredInterviews.length > 0) {
    const interviewIds = filteredInterviews.map((i) => i.id)
    const interviewerIds = [...new Set(filteredInterviews.map((i) => i.interviewer_id))]

    const [answersRes, interviewersRes, questionsRes] = await Promise.all([
      supabase
        .from('answers')
        .select('interview_id, question_id, option_id')
        .in('interview_id', interviewIds),
      supabase
        .from('interviewers')
        .select('id, first_name')
        .in('id', interviewerIds),
      supabase
        .from('questions')
        .select('id, options(id, label_nl)')
        .eq('quiz_id', quizId),
    ])

    // Map option_id → label_nl
    const optionLabelMap = new Map<string, string>()
    for (const q of questionsRes.data ?? []) {
      for (const o of (q.options as Array<{ id: string; label_nl: string }>) ?? []) {
        optionLabelMap.set(o.id, o.label_nl)
      }
    }

    // Map interview_id → antwoorden
    const answersMap = new Map<string, Record<string, string>>()
    for (const a of answersRes.data ?? []) {
      if (!answersMap.has(a.interview_id)) answersMap.set(a.interview_id, {})
      answersMap.get(a.interview_id)![a.question_id] = optionLabelMap.get(a.option_id) ?? ''
    }

    // Map interviewer_id → naam
    const nameMap = new Map((interviewersRes.data ?? []).map((iv) => [iv.id, iv.first_name]))

    // Ruwe rijen samenstellen
    rawRows = filteredInterviews
      .sort((a, b) => a.started_at.localeCompare(b.started_at))
      .map((iv) => ({
        id: iv.id,
        started_at: iv.started_at,
        interviewer: nameMap.get(iv.interviewer_id) ?? iv.interviewer_id,
        language: iv.language,
        status: iv.status === 'completed' ? 'Afgewerkt' : 'Afgebroken',
        answers: answersMap.get(iv.id) ?? {},
      }))

    // Ranking
    const rankMap = new Map<string, { name: string; completed: number; aborted: number }>()
    for (const iv of allInterviews) {
      const name = nameMap.get(iv.interviewer_id) ?? iv.interviewer_id
      const existing = rankMap.get(iv.interviewer_id) ?? { name, completed: 0, aborted: 0 }
      if (iv.status === 'completed') existing.completed++
      else existing.aborted++
      rankMap.set(iv.interviewer_id, existing)
    }
    ranking = [...rankMap.values()].sort((a, b) => b.completed - a.completed)
  }

  return {
    quizTitle: quizRes.data.title,
    quizVersion: quizRes.data.version,
    completed,
    aborted,
    first_at: dates[0] ?? null,
    last_at: dates[dates.length - 1] ?? null,
    questions,
    results,
    rawRows,
    ranking,
  }
}
