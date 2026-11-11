import type { QuizResultRow } from './supabase'

// ─── Resultaten berekening ────────────────────────────────────────────────────

export interface OptionResult {
  option_id: string
  option_position: number
  label_nl: string
  count: number
  percentage: number
}

export interface QuestionResult {
  question_id: string
  question_position: number
  question_text_nl: string
  total_n: number
  options: OptionResult[]
}

export function calculateResults(rows: QuizResultRow[]): QuestionResult[] {
  const questionMap = new Map<string, QuestionResult>()

  for (const row of rows) {
    if (!questionMap.has(row.question_id)) {
      questionMap.set(row.question_id, {
        question_id: row.question_id,
        question_position: row.question_position,
        question_text_nl: row.question_text_nl,
        total_n: row.total_n,
        options: [],
      })
    }

    const question = questionMap.get(row.question_id)!
    const percentage = row.total_n > 0
      ? Math.round((row.count / row.total_n) * 1000) / 10 // 1 decimaal
      : 0

    question.options.push({
      option_id: row.option_id,
      option_position: row.option_position,
      label_nl: row.option_label_nl,
      count: row.count,
      percentage,
    })
  }

  return Array.from(questionMap.values())
    .sort((a, b) => a.question_position - b.question_position)
    .map((q) => ({
      ...q,
      options: q.options.sort((a, b) => a.option_position - b.option_position),
    }))
}
