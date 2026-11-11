import { describe, it, expect } from 'vitest'
import { calculateResults } from '@/lib/results'
import type { QuizResultRow } from '@/lib/supabase'

function row(overrides: Partial<QuizResultRow> = {}): QuizResultRow {
  return {
    question_id: 'q1',
    question_position: 1,
    question_text_nl: 'Testvraag',
    option_id: 'o1',
    option_position: 1,
    option_label_nl: 'Optie A',
    count: 0,
    total_n: 0,
    ...overrides,
  }
}

describe('calculateResults', () => {
  it('geeft lege array terug bij lege input', () => {
    expect(calculateResults([])).toEqual([])
  })

  it('berekent 100% voor één optie met alle stemmen', () => {
    const rows = [row({ count: 10, total_n: 10 })]
    const results = calculateResults(rows)
    expect(results).toHaveLength(1)
    expect(results[0].options[0].percentage).toBe(100)
    expect(results[0].options[0].count).toBe(10)
    expect(results[0].total_n).toBe(10)
  })

  it('berekent 0% als total_n 0 is', () => {
    const rows = [row({ count: 0, total_n: 0 })]
    const results = calculateResults(rows)
    expect(results[0].options[0].percentage).toBe(0)
  })

  it('groepeert opties per vraag correct', () => {
    const rows = [
      row({ option_id: 'o1', option_position: 1, option_label_nl: 'A', count: 3, total_n: 5 }),
      row({ option_id: 'o2', option_position: 2, option_label_nl: 'B', count: 2, total_n: 5 }),
    ]
    const results = calculateResults(rows)
    expect(results).toHaveLength(1)
    expect(results[0].options).toHaveLength(2)
    expect(results[0].options[0].percentage).toBe(60)
    expect(results[0].options[1].percentage).toBe(40)
  })

  it('sorteert vragen op positie', () => {
    const rows = [
      row({ question_id: 'q2', question_position: 2, question_text_nl: 'Vraag 2', option_id: 'o3', count: 1, total_n: 1 }),
      row({ question_id: 'q1', question_position: 1, question_text_nl: 'Vraag 1', option_id: 'o1', count: 1, total_n: 1 }),
    ]
    const results = calculateResults(rows)
    expect(results[0].question_position).toBe(1)
    expect(results[1].question_position).toBe(2)
  })

  it('sorteert opties op positie binnen een vraag', () => {
    const rows = [
      row({ option_id: 'o2', option_position: 2, option_label_nl: 'B', count: 1, total_n: 2 }),
      row({ option_id: 'o1', option_position: 1, option_label_nl: 'A', count: 1, total_n: 2 }),
    ]
    const results = calculateResults(rows)
    expect(results[0].options[0].option_position).toBe(1)
    expect(results[0].options[1].option_position).toBe(2)
  })

  it('rondt percentages af op 1 decimaal', () => {
    // 1/3 = 33.333...% → 33.3%
    const rows = [
      row({ option_id: 'o1', option_position: 1, count: 1, total_n: 3 }),
      row({ option_id: 'o2', option_position: 2, count: 1, total_n: 3 }),
      row({ option_id: 'o3', option_position: 3, count: 1, total_n: 3 }),
    ]
    const results = calculateResults(rows)
    results[0].options.forEach((o) => {
      expect(o.percentage).toBe(33.3)
    })
  })
})
