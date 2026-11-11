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
  question_type: string
  total_n: number
  options: OptionResult[]
}

const YES_NO_LABELS: Record<number, string> = { 1: 'Ja', 2: 'Nee', 3: 'Weet ik niet' }

export function calculateResults(
  rows: QuizResultRow[],
  questionTypes?: Map<string, string>,
): QuestionResult[] {
  const questionMap = new Map<string, QuestionResult>()

  for (const row of rows) {
    if (!questionMap.has(row.question_id)) {
      questionMap.set(row.question_id, {
        question_id: row.question_id,
        question_position: row.question_position,
        question_text_nl: row.question_text_nl,
        question_type: questionTypes?.get(row.question_id) ?? '',
        total_n: row.total_n,
        options: [],
      })
    }

    const question = questionMap.get(row.question_id)!
    const isYesNo = question.question_type === 'yes_no_unknown'
    const percentage = row.total_n > 0
      ? Math.round((row.count / row.total_n) * 1000) / 10
      : 0

    question.options.push({
      option_id: row.option_id,
      option_position: row.option_position,
      label_nl: isYesNo
        ? (YES_NO_LABELS[row.option_position] ?? row.option_label_nl)
        : row.option_label_nl,
      count: row.count,
      percentage,
    })
  }

  // Voor yes_no_unknown: ontbrekende posities aanvullen met 0 antwoorden
  for (const q of questionMap.values()) {
    if (q.question_type === 'yes_no_unknown') {
      const existing = new Set(q.options.map((o) => o.option_position))
      for (const [pos, label] of Object.entries(YES_NO_LABELS)) {
        if (!existing.has(Number(pos))) {
          q.options.push({
            option_id: `synthetic-${q.question_id}-${pos}`,
            option_position: Number(pos),
            label_nl: label,
            count: 0,
            percentage: 0,
          })
        }
      }
    }
  }

  return Array.from(questionMap.values())
    .sort((a, b) => a.question_position - b.question_position)
    .map((q) => ({
      ...q,
      options: q.options.sort((a, b) => a.option_position - b.option_position),
    }))
}
